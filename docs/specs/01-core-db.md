# Spec: Core DB Layer

**Issue**: n/a
**Status**: Draft
**Date**: 2026-05-01

## Problem
Finnisher needs a persistent, synchronous data layer shared between the `finn` CLI and the `finn web` local server. Without it, no other phase (CLI, hooks, dashboard) can be built. The DB must surface focus warnings (never hard blocks) when active threads exceed 5, provide prioritization signals, and compute stalled detection without any background daemon.

## Context
New project — no existing code. Data lives at `~/.finnisher/db.sqlite`. Both the CLI (a Node.js binary) and the Next.js web server run in the same Node.js runtime, making synchronous `better-sqlite3` the right fit (no async impedance mismatch, no connection pooling needed). Drizzle ORM provides type-safe query building and migration management via `drizzle-kit`.

## Acceptance Criteria

- [ ] Given the DB file does not exist, when any DB function is called for the first time, then `~/.finnisher/` is created and `db.sqlite` is initialized with the correct schema
- [ ] Given a thread is created with `state: 'active'` regardless of how many active threads exist, when `createThread` is called, then it always succeeds and the thread is persisted
- [ ] Given `activeThreadCount()` returns a count, when `overloadWarning(count)` is called, then: ≤5 returns `null`; 6–8 returns a `{ level: 'caution', message, suggestions }` object; 9+ returns `{ level: 'urgent', message, suggestions }`
- [ ] Given `overloadWarning` returns suggestions, then `suggestions` is an array of thread IDs sorted by: stalled first, then waiting, then oldest `updatedAt` — these are the candidates to close or park
- [ ] Given a thread exists, when `touchThread(id)` is called and the thread state is not `done`, then `updatedAt` is bumped to now and no other fields change
- [ ] Given a thread has `state: 'done'`, when `touchThread(id)` is called, then the call is a no-op (updatedAt does not change)
- [ ] Given a thread's `updatedAt` is more than 48 hours ago and state is not `done`, when `isStalled(thread)` is called, then it returns `true`
- [ ] Given a thread's `updatedAt` is less than 48 hours ago, when `isStalled(thread)` is called, then it returns `false`
- [ ] Given a thread is marked done via `updateState(id, 'done')`, then `completedAt` is set to the current timestamp
- [ ] Given both the CLI and web server read/write simultaneously, then WAL mode prevents lock errors
- [ ] Given `runMigrations()` is called multiple times, then it is idempotent (no error, no duplicate schema)
- [ ] All exported DB functions are synchronous — no `Promise`, no `async/await`

## Technical Design

### Data Model Changes

**New table: `threads`**
```sql
CREATE TABLE threads (
  id           TEXT PRIMARY KEY,          -- nanoid(10)
  title        TEXT NOT NULL,
  state        TEXT NOT NULL DEFAULT 'active',  -- 'active'|'waiting'|'blocked'|'done'
  next_action  TEXT NOT NULL,
  owner        TEXT NOT NULL DEFAULT 'you',     -- 'you'|'ai_agent'|'other'
  notes        TEXT,
  created_at   INTEGER NOT NULL,          -- Unix ms timestamp
  updated_at   INTEGER NOT NULL,          -- Unix ms timestamp
  completed_at INTEGER                    -- NULL until state=done
);
```

**New table: `sessions`**
```sql
CREATE TABLE sessions (
  id              TEXT PRIMARY KEY,       -- nanoid(10)
  thread_id       TEXT REFERENCES threads(id),  -- nullable
  agent           TEXT NOT NULL,          -- 'claude_code'|'codex'|'opencode'|'manual'
  started_at      INTEGER NOT NULL,
  ended_at        INTEGER,                -- NULL = session still open
  tokens_in       INTEGER,
  tokens_out      INTEGER,
  cost_usd        REAL,
  git_branch      TEXT,
  last_commit_sha TEXT,
  last_commit_msg TEXT,
  unpushed_count  INTEGER,
  open_files      TEXT,                   -- JSON array string
  project_path    TEXT
);
```

### API / Interface Changes

**`src/db/schema.ts`** — Drizzle table definitions + exported TypeScript types:
```typescript
export type ThreadState = 'active' | 'waiting' | 'blocked' | 'done'
export type ThreadOwner = 'you' | 'ai_agent' | 'other'
export type AgentType  = 'claude_code' | 'codex' | 'opencode' | 'manual'
export type Thread     = typeof threads.$inferSelect
export type NewThread  = typeof threads.$inferInsert
export type Session    = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
```

**`src/db/db.ts`** — singleton connection:
```typescript
export function getDb(): BetterSQLite3Database<typeof schema>
```

**`src/db/migrate.ts`**:
```typescript
export function runMigrations(): void  // idempotent, called at CLI startup
```

**`src/db/threads.ts`**:
```typescript
export function listThreads(): Thread[]
export function getThread(id: string): Thread | undefined
export function createThread(input: Omit<NewThread, 'id' | 'createdAt' | 'updatedAt'>): Thread
export function updateNextAction(id: string, nextAction: string): void
export function updateState(id: string, state: ThreadState): void
export function touchThread(id: string): void
export function deleteThread(id: string): void
export function isStalled(thread: Thread): boolean
```

**`src/db/sessions.ts`**:
```typescript
export function createSession(input: Omit<NewSession, 'id'>): Session
export function closeSession(id: string, data: Partial<NewSession>): void
export function listSessions(opts?: { threadId?: string; limit?: number }): Session[]
export function getOpenSessions(): Session[]     // endedAt IS NULL
```

**`src/db/index.ts`** — barrel re-export of all of the above.

### Key Logic

**Focus warning** (new export in `src/db/threads.ts`):
```typescript
export type WarningLevel = 'caution' | 'urgent'
export interface FocusWarning {
  level: WarningLevel
  count: number
  message: string
  suggestions: Thread[]  // candidates to complete or park, in priority order
}

export function activeThreadCount(): number

export function overloadWarning(threads: Thread[]): FocusWarning | null {
  const active = threads.filter(t => t.state === 'active')
  const count = active.length
  if (count <= 5) return null

  // Prioritise: stalled first, then waiting-adjacent (least recently updated)
  const suggestions = [...active]
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())

  return {
    level: count >= 9 ? 'urgent' : 'caution',
    count,
    message: count >= 9
      ? `⛔ ${count} active threads — focus is critically scattered. Finish or park these first:`
      : `⚠  ${count} active threads — above the 5-thread focus ideal. Consider closing these:`,
    suggestions: suggestions.slice(0, 3),
  }
}
```
`createThread` and `updateState` never throw for count reasons — callers receive the warning separately.

**Stalled detection** (pure function, no DB call):
```typescript
const STALL_MS = 48 * 60 * 60 * 1000
export function isStalled(thread: Thread): boolean {
  return thread.state !== 'done' && (Date.now() - thread.updatedAt) > STALL_MS
}
```

**WAL pragma** — set once on DB open:
```typescript
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
```

**Timestamps** — stored as Unix milliseconds (`INTEGER`), not ISO strings. Drizzle `{ mode: 'timestamp' }` maps them to `Date` objects in TypeScript.

## Test Scenarios

### Happy Path
1. Call `createThread({ title: 'Ship MVP', nextAction: 'Write schema', state: 'active', owner: 'you' })` → returns thread with `id` (10 chars), `createdAt` and `updatedAt` set to now
2. Call `listThreads()` → returns the created thread
3. Call `touchThread(id)` → `updatedAt` advances, all other fields unchanged
4. Call `updateState(id, 'done')` → `state === 'done'`, `completedAt` is set
5. Create 4 more active threads (total 5) → all succeed, `overloadWarning` returns `null`
6. Create a 6th active thread → succeeds, `overloadWarning` returns `{ level: 'caution', count: 6, suggestions: [<oldest thread>] }`
7. Call `runMigrations()` twice → no error on second call

### Edge Cases
1. `touchThread` on a `done` thread → updatedAt unchanged (SQL WHERE filters it out)
2. Thread with `updatedAt` exactly at 48h boundary → `isStalled` returns `false` (strict `>`)
3. `createSession({ threadId: null, agent: 'manual', startedAt: new Date() })` → valid, no FK error
4. `closeSession` with partial data → only provided fields updated, others remain NULL
5. `overloadWarning` with 9 active threads → `level: 'urgent'`, top 3 oldest suggested
6. `overloadWarning` with 5 active threads → returns `null`

### Error Cases
1. `createThread({ title: '', nextAction: '' })` with empty strings → DB accepts (no CHECK constraint); validation is CLI's responsibility
2. `getThread('nonexistent')` → returns `undefined`, does not throw

## Out of Scope
- CLI output formatting — this spec covers DB layer only
- Web API routes — covered in Phase 4 spec
- Hook handlers — covered in Phase 3 spec
- `finn setup` DB directory creation at install time — CLI spec (Phase 2) handles the UX; DB layer handles creation transparently
- Input validation beyond the 5-active rule (e.g. title length, nextAction format) — CLI's responsibility
- Encryption or auth on the SQLite file

## Open Questions
None.

## Implementation Notes
- File layout: `src/db/schema.ts`, `src/db/db.ts`, `src/db/migrate.ts`, `src/db/threads.ts`, `src/db/sessions.ts`, `src/db/index.ts`
- Migrations folder: `src/db/migrations/` — generated by `drizzle-kit generate`, committed to repo
- `drizzle-kit` config at `drizzle.config.ts` in project root
- `nanoid` must be imported as ESM; set `"type": "module"` in `package.json` or use dynamic import if CJS
- `better-sqlite3` is a native addon — add to `serverExternalPackages` in `next.config.ts` later
- All timestamp columns use `integer('...', { mode: 'timestamp' })` so Drizzle handles the ms↔Date conversion
- The singleton `getDb()` uses a module-level variable — safe because Node.js caches modules; one DB instance per process
