# Spec: Hook System + `finn setup`

**Issue**: n/a
**Status**: Draft
**Date**: 2026-05-01

## Problem
Finnisher's value proposition depends on automatic activity tracking — threads should update and sessions should be logged without manual intervention. Users need hooks that fire when they use Claude Code, Codex, or OpenCode, and a single `finn setup` command that wires everything up.

## Context
Builds on Phase 1 (Core DB) and Phase 2 (CLI). Hooks call `finn` sub-commands or a `finn hook <event>` dispatcher. The `.finn-thread` file convention links a project directory to a thread ID. All hooks must exit 0 unconditionally — they must never block an agent or a git operation.

## Acceptance Criteria

- [ ] Given `finn setup` is run, then it creates `~/.finnisher/` if it doesn't exist and initializes the DB
- [ ] Given `finn setup` detects `claude` on PATH, then it writes PostToolUse + Stop hook entries to `~/.claude/settings.json` without destroying existing hook config
- [ ] Given `finn setup` detects `codex` on PATH, then it writes hook files to `~/.codex/hooks/post-session`
- [ ] Given `finn setup` detects `opencode` on PATH, then it adds an `after` hook to `~/.opencode/config.json`
- [ ] Given none of the agents are installed, then `finn setup` completes successfully with a note listing unregistered agents
- [ ] Given a `.finn-thread` file exists in the working directory, when the Claude Code Stop hook fires, then a session row is created/closed with tokensIn, tokensOut, costUsd from stdin JSON, and git state captured
- [ ] Given a `.finn-thread` file exists, when the Claude Code PostToolUse hook fires, then `touchThread` is called and the thread's `updatedAt` is bumped
- [ ] Given a `.finn-thread` file does NOT exist, when any hook fires, then the hook exits 0 silently with no DB writes
- [ ] Given a Stop hook fires with valid stdin JSON `{ totalCostUSD, tokensIn, tokensOut }`, then those values are stored on the session row
- [ ] Given `finn hook git-post-commit` is run inside a repo with a `.finn-thread` file, then `touchThread` is called
- [ ] Given any hook encounters an error (DB locked, finn not on PATH, malformed JSON), then it logs to `~/.finnisher/hook.log` and exits 0
- [ ] Given `finn setup --git` is run, then a `post-commit` hook is installed in `.git/hooks/post-commit` of the current directory

### Session lifecycle (Claude Code)
- [ ] On **PreToolUse** (first tool call of a session): if no open session exists for this `sessionId`, create a new session row with `startedAt=now`, `agent=claude_code`, `gitBranch` from `git branch --show-current`, `projectPath=cwd`
- [ ] On **Stop**: find the open session by `projectPath` (or create one if missing), set `endedAt=now`, write token/cost data, capture `lastCommitSha`, `lastCommitMsg`, `unpushedCount` via git commands, link to `threadId` from `.finn-thread`

## Technical Design

### Data Model Changes
None — uses `createSession` and `closeSession` from Phase 1.

### API / Interface Changes

**`finn hook <event>`** dispatcher — new CLI subcommand:
```
finn hook claude-pre-tool-use   # reads stdin JSON, creates/touches session
finn hook claude-stop           # reads stdin JSON, closes session + captures git
finn hook codex-stop            # reads stdin JSON (codex format), closes session
finn hook opencode-stop         # reads stdin JSON (opencode format), closes session
finn hook git-post-commit       # no stdin, just touch thread
```

All events handled in `src/hooks/` with one file per agent:
- `src/hooks/claude.ts`
- `src/hooks/codex.ts`
- `src/hooks/opencode.ts`
- `src/hooks/git.ts`
- `src/hooks/common.ts` — shared: read `.finn-thread`, git helpers, safe logger

**`finn setup`** — new CLI subcommand in `src/cli/commands/setup.ts`:
```typescript
export function register(program: Command): void
```

**Git helpers in `src/hooks/common.ts`:**
```typescript
export function getThreadId(cwd?: string): string | null   // reads .finn-thread
export function gitBranch(cwd: string): string | null
export function gitHead(cwd: string): { sha: string; msg: string } | null
export function gitUnpushedCount(cwd: string): number
export function appendHookLog(msg: string): void           // ~/.finnisher/hook.log
```

### Key Logic

**`~/.claude/settings.json` merge strategy:**
```typescript
// Read existing JSON (or {}), deep-merge hook arrays, write back
const existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}')
const hooks = existing.hooks ?? {}
hooks.PostToolUse = dedupe([...(hooks.PostToolUse ?? []), claudePreToolUseEntry])
hooks.Stop        = dedupe([...(hooks.Stop ?? []), claudeStopEntry])
existing.hooks = hooks
fs.writeFileSync(settingsPath, JSON.stringify(existing, null, 2))
```
`dedupe` checks that the exact command string isn't already present before appending.

**Claude Stop stdin payload:**
```json
{ "totalCostUSD": 0.12, "tokensIn": 8000, "tokensOut": 1200, "sessionId": "abc" }
```

**Session identity for Claude Code:**
Claude Code doesn't provide a per-invocation session ID on PostToolUse, so we use `projectPath` as the session key for "open" sessions. If a session is open for the same `projectPath` on Stop, we close it; otherwise we create + close in one step.

**`finn setup` output format:**
```
✓ DB initialized at ~/.finnisher/db.sqlite
✓ Claude Code hooks registered
✓ Codex hooks registered
✗ OpenCode not found on PATH (skipped)

Run: echo "<thread-id>" > .finn-thread
  in any project to link it to a thread.
```

**`finn setup --git` writes:**
```bash
#!/bin/bash
finn hook git-post-commit
exit 0
```
to `.git/hooks/post-commit` (chmod +x). Checks if file already exists and appends only the `finn` line if so.

**Error guard pattern** (all hook handlers):
```typescript
try {
  // ... hook logic
} catch (err) {
  appendHookLog(`[${event}] ${String(err)}`)
}
process.exit(0)  // always
```

## Test Scenarios

### Happy Path
1. Fresh machine, `finn setup` → creates `~/.finnisher/`, writes hooks, prints confirmation
2. Claude session in project with `.finn-thread` → Stop fires → session row created with tokens + git data
3. `git commit` in project with `.finn-thread` → thread `updatedAt` bumped
4. `finn setup` run twice → no duplicate hook entries in `settings.json`

### Edge Cases
1. `~/.claude/settings.json` has existing hooks → `finn setup` appends without removing existing entries
2. `.finn-thread` contains trailing whitespace/newline → trimmed before use
3. No git repo in project dir → `gitBranch` returns null, session created with null git fields
4. `finn setup --git` when `.git/hooks/post-commit` already exists → appends `finn hook git-post-commit` line
5. Stop hook fires before any PreToolUse (e.g. very short session) → create + close session in one step

### Error Cases
1. `finn` not on PATH when hook fires → hook script exits 0, logs error to `hook.log`
2. `~/.claude/settings.json` contains invalid JSON → `finn setup` prints warning, writes fresh config rather than crashing
3. DB locked when hook fires → caught, logged, exits 0
4. stdin is empty or malformed JSON on Stop hook → log error, still exit 0 (session may be created with null token fields)

## Out of Scope
- Codex and OpenCode specific stdin payload formats beyond what's publicly documented
- Automatic git `core.hooksPath` global configuration
- Removing/unregistering hooks (`finn setup --uninstall`)
- Support for agents other than Claude Code, Codex, OpenCode

## Open Questions
None.

## Implementation Notes
- Hook scripts registered in `~/.claude/settings.json` use the full path to `finn` binary — use `which finn` or `process.execPath`-relative path at setup time
- `src/hooks/common.ts` `getThreadId()` reads `<cwd>/.finn-thread` — default cwd is `process.cwd()`
- Git commands run via `child_process.execSync` with `{ encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }` — capture stderr to avoid noise; return null on non-zero exit
- `appendHookLog` appends a timestamped line to `~/.finnisher/hook.log`; no log rotation for MVP
- Claude Code `settings.json` path: `~/.claude/settings.json`
- Codex hooks path: `~/.codex/hooks/` (create dir if needed)
- OpenCode config path: `~/.opencode/config.json`
