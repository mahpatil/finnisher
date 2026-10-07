@../CLAUDE.md

# Finnisher — Claude Code Context

## What This Is
Finnisher is a personal execution tracking system. It tracks **Threads** (units of outcome) and **Sessions** (AI agent work sessions). Not a task manager — an execution momentum system.

## Architecture
Single npm package (`finnisher`), no monorepo.

```
finnisher/
├── src/
│   ├── db/           # Drizzle ORM schema + SQLite CRUD
│   ├── cli/          # Commander CLI commands
│   ├── web/          # Next.js 15 App Router dashboard
│   └── hooks/        # Hook handlers for Claude/Codex/OpenCode
├── package.json      # bin: { finn: ./dist/cli/index.js }
└── install.sh        # curl-installable bootstrap
```

**Data:** `~/.finnisher/db.sqlite` (shared by CLI + web, WAL mode)

## Key Constraints
- **5 active threads = the focus ideal** — the system warns (never blocks) when exceeded; warns get more urgent as count grows; system actively helps user prioritize and close threads
- Stalled detection: `Date.now() - updatedAt > 48h` — computed at read time, no daemon
- `nextAction` is non-nullable — every thread must have one
- All hooks exit 0 always — never block Claude or git

## Data Model

### Threads
`id` (nanoid10) · `title` · `state` (active/waiting/blocked/done) · `nextAction` · `owner` (you/ai_agent/other) · `notes` · `createdAt` · `updatedAt` · `completedAt`

### Sessions
`id` · `threadId` (nullable FK) · `agent` (claude_code/codex/opencode/manual) · `startedAt` · `endedAt` · `tokensIn` · `tokensOut` · `costUsd` · `gitBranch` · `lastCommitSha` · `lastCommitMsg` · `unpushedCount` · `openFiles` (JSON) · `projectPath`

## CLI Commands
`finn setup` · `finn list` · `finn add` · `finn next <id> <action>` · `finn done <id>` · `finn status <id> <state>` · `finn web` (port 3141) · `finn sessions` · `finn touch <id>` (hooks only)

## Hook System
Hooks read `.finn-thread` file in project root (contains thread ID) to know which thread to touch.

- **Claude Code:** `PostToolUse` + `Stop` hooks in `~/.claude/settings.json`
- **Codex:** `~/.codex/hooks/`
- **OpenCode:** `~/.opencode/config.json`
- **Git:** `post-commit` hook per repo

Claude Stop hook reads stdin JSON `{ totalCostUSD, tokensIn, tokensOut, sessionId }`.

## Tech Stack
- `drizzle-orm` + `better-sqlite3` (synchronous — no async/await in DB layer)
- `commander` + `@clack/prompts` for CLI
- `chalk` + `cli-table3` for output
- `next@15` + `react@19` + `tailwindcss@4` + `shadcn` for web
- `swr` with 5s polling in dashboard

## Next.js Config Requirement
```typescript
serverExternalPackages: ['better-sqlite3']  // native addon, don't bundle
```

## Implementation Order
1. Core DB (schema → migrations → CRUD)
2. CLI commands
3. Hook handlers + `finn setup` auto-detection
4. `install.sh` curl bootstrap
5. Web dashboard (API routes → 5-tab dashboard)

## .finn-thread Convention
Any project can link to a thread by placing a `.finn-thread` file in the root:
```bash
echo "abc123xyz" > .finn-thread
```
Add `.finn-thread` to `.gitignore` — it's personal state, not shared.

## Development Workflow
1. Check spec exists in `docs/specs/` — if not, create one with `/spec`
2. Review the spec, then create a feature branch for the work
3. Implement using TDD: `/coder <spec-file>`
4. After completing each significant chunk of work, commit and push immediately — do not wait until the end
5. Run all tests
6. Review the implemented code
7. Request necessary changes if anything is off
8. **Commit discipline:** After finishing any feature, fix, or meaningful unit of work — commit with a clear message and push. Do not let changes accumulate without committing.

## Principles
- Always use TDD — write tests first, make them pass, then refactor
- Write UI tests using Playwright
- Reduce code duplication — shared logic lives in `src/db/` (data) or `src/cli/ui/format.ts` (output); hook handlers share logic via `src/hooks/common.ts`
- Think reliability and failure scenarios — every hook must exit 0, every error must be caught and logged
- Use Chrome (via browser automation) to test UI features yourself before marking them done

## Security Notes
- DB at `~/.finnisher/db.sqlite` is user-local — no multi-user access, no API auth needed for local web server
- Thread titles/notes are plaintext by design — nothing sensitive stored
- Drizzle ORM parameterised queries only — never concatenate user input into raw SQL
- `finn web` binds to `localhost` only, never `0.0.0.0`
- Hook errors log to `~/.finnisher/hook.log`; never log to stdout in hooks (corrupts agent output)

## TypeScript
No `any` — use `unknown` + narrowing at boundaries. No type assertions except at validated parse boundaries (e.g. `JSON.parse` result).

## Releases
Commits drive semantic-release (versioning + CHANGELOG) — never manually bump `package.json` version. Run `npm audit` before each release; block on high/critical.
