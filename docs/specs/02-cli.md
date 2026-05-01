# Spec: CLI Commands (`finn`)

**Issue**: n/a
**Status**: Draft
**Date**: 2026-05-01

## Problem
Users need a fast, terminal-native interface to manage threads and inspect sessions without opening a browser. The CLI must be installable globally as `finn`, cover every core operation, and be usable by both technical and non-technical users via interactive prompts.

## Context
Builds on Phase 1 (Core DB). All DB calls come from `@finnisher/core` (the `src/db/` layer). CLI entry point compiles to `dist/cli/index.js` and is exposed via `package.json` `bin`. Uses `commander` for argument parsing and `@clack/prompts` for the interactive `finn add` flow. Output uses `chalk` for color and `cli-table3` for tabular display.

## Acceptance Criteria

- [ ] Given `finn` is run with no subcommand, then it prints help text and exits 0
- [ ] Given `finn list`, then it prints a table of active threads + a stalled count line; threads with `isStalled === true` show a `⚠` warning
- [ ] Given `finn list --state waiting`, then only threads with `state === 'waiting'` are shown
- [ ] Given `finn add` is run interactively, then it prompts for title, next action, owner, and state in sequence; on completion the thread is created and its ID printed
- [ ] Given `finn add --title "X" --next "Y"`, then the thread is created non-interactively with defaults (owner=you, state=active)
- [ ] Given creating a thread results in 6+ active threads, then the thread is created AND a focus warning block is printed showing count, level, and the top suggested threads to close or park
- [ ] Given `finn list`, then if `overloadWarning` is non-null, a warning banner is printed above the thread table with suggestions
- [ ] Given `finn next <id> <action>`, then `nextAction` is updated, a confirmation line is printed, and exit is 0
- [ ] Given `finn done <id>`, then state is set to done, a summary line with time-to-completion is printed, and if a focus warning existed it recalculates and shows updated count
- [ ] Given `finn status <id> <state>`, then state transitions correctly; if transitioning to active triggers a focus warning, prints it after the confirmation
- [ ] Given `finn sessions`, then a table of the 20 most recent sessions is printed with: agent, duration, tokens in/out, cost, branch, last commit, unpushed count
- [ ] Given `finn sessions --thread <id>`, then only sessions for that thread are shown
- [ ] Given `finn touch <id>`, then it runs silently (no stdout), always exits 0, including when the thread does not exist
- [ ] Given any command is run and the DB does not yet exist, then `runMigrations()` is called transparently before executing

## Technical Design

### Data Model Changes
None — reads/writes through `src/db/` layer only.

### API / Interface Changes

**Entry point:** `src/cli/index.ts`
```typescript
#!/usr/bin/env node
// Calls runMigrations(), registers all subcommands, calls program.parse()
```

**Command files:** `src/cli/commands/{list,add,next,done,status,sessions,touch,web}.ts`
Each exports `register(program: Command): void`.

**Output helpers:** `src/cli/ui/format.ts`
```typescript
export function stateBadge(state: ThreadState): string        // chalk-colored pill
export function stalledBadge(): string                        // chalk red '⚠ STALLED'
export function durationStr(ms: number): string               // "2h 14m"
export function costStr(usd: number | null): string           // "$0.12" or "—"
export function printFocusWarning(w: FocusWarning): void      // prints warning block
```

**Focus warning output format (`printFocusWarning`):**
```
⚠  6 active threads — above the 5-thread focus ideal. Consider closing these:

  → abc123xyz  "Ship Rust prototype"       last touched 3d ago  (stalled)
  → def456uvw  "Write TokenOps article"    last touched 2d ago
  → ghi789rst  "CTO interview prep"        last touched 1d ago

  Run: finn done <id>   or   finn status <id> waiting
```
For `urgent` level, uses red chalk and `⛔` instead of `⚠`.

### Key Logic

**`finn list` output columns:**
`ID` · `Title` · `State` · `Owner` · `Next Action` · `Updated` · `⚠`

Rows sorted: active threads by `updatedAt` ASC (most neglected first), then waiting/blocked, then done (hidden by default unless `--state done`).

**`finn add` interactive flow (`@clack/prompts`):**
1. `text` → title (required, min 1 char)
2. `text` → next action (required, min 1 char)
3. `select` → owner: you / ai_agent / other (default: you)
4. `select` → state: active / waiting / blocked (default: active)

On cancel (Ctrl-C) → print "Cancelled." and exit 0.

**`finn sessions` columns:**
`ID` · `Agent` · `Thread` · `Started` · `Duration` · `Tokens In` · `Tokens Out` · `Cost` · `Branch` · `Last Commit` · `Unpushed`

Duration = `endedAt - startedAt`; if `endedAt` is null, show `running`.

**`finn touch` must never throw** — wrap entire body in try/catch, always exit 0.

**`finn web`** — spawns the Next.js server (Phase 4). Stub for now: print `"finn web coming in Phase 4"` and exit 0.

## Test Scenarios

### Happy Path
1. `finn list` on empty DB → prints empty table with header + "0 stalled" footer
2. `finn add --title "Ship MVP" --next "Write schema"` → thread created, ID printed
3. `finn list` → shows the new thread with green `active` badge
4. `finn next <id> "Review PR"` → prints `✓ Next action updated`
5. `finn done <id>` → prints `✓ Done. Completed in 2h 14m`
6. `finn sessions` → shows table (may be empty on fresh install)
7. `finn add` with 5 already active → 6th thread created, then focus warning printed with top 3 suggestions

### Edge Cases
1. `finn list --state done` → shows only completed threads
2. `finn touch nonexistent-id` → silent, exit 0
3. `finn add` → Ctrl-C mid-flow → "Cancelled." exit 0
4. `finn sessions --thread <id>` with no sessions → empty table, exit 0
5. `finn list` with 9 active threads → urgent red warning banner above table
6. `finn done <id>` drops count from 6 to 5 → no warning shown after

### Error Cases
1. `finn next nonexistent "action"` → `Error: Thread not found: <id>` exit 1
2. `finn done nonexistent` → `Error: Thread not found: <id>` exit 1
3. `finn status <id> invalid-state` → Commander validation error, exit 1

## Out of Scope
- `finn web` full implementation — Phase 4
- `finn setup` hook registration — Phase 3
- `finn stats` weekly report — post-MVP
- Color themes or config flags
- Shell completion scripts

## Open Questions
None.

## Implementation Notes
- `src/cli/index.ts` must have `#!/usr/bin/env node` as first line; `dist/cli/index.js` must be chmod +x after build
- Use `process.exitCode = 1` + `process.exit()` for error exits, not `throw` at the top level
- `commander` `.exitOverride()` lets tests catch parse errors without process.exit
- `cli-table3` column widths: cap Title at 35 chars, Next Action at 40 chars with ellipsis
- Import `nanoid` at the DB layer, not CLI — CLI just calls `createThread`
