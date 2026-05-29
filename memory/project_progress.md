# Finnisher — Project Progress

## Step 10 — Finish Engine (v0.3) — ✅ Done (2026-05-27)
Commits: `fd30ab7` → `493dafb`
Summary: F3 abandon prevention at `finn add` (stall interrupt with configurable threshold); F1 launch gate per-thread criteria with `finn launch`, `[READY]` badge, dashboard checkboxes; F2 completion signal (4-factor formula) with `[~DONE]` badge in list and Sprint Candidates dashboard section; F4 session intent (`finn intent`, sessions table `intent` column, SessionCard display); F5 `finn week`/`finn day` execution summary commands; 352 unit tests + 46 Playwright.

## Step 9 — Responsive UI, Thread Todos, Priority Card Highlights — ✅ Done (2026-05-25)
Commits: `2fb2445` → `a783da0`
Summary: Mobile-responsive sidebar (hamburger + temporary drawer), desktop sidebar collapse toggle, red/orange left border on now/next thread cards, per-thread todo checklist (add/toggle/edit/delete) with SWR persistence, done/total ✓ chip on thread cards; 24 unit tests + 19 Playwright e2e tests.

## Step 8 — Dashboard PATCH Error Handling — ✅ Done (2026-05-25)
Commits: `792efa4` → `4d986b5`
Summary: Extracted shared `patchThread` helper to `src/web/lib/api.ts` (throws on non-2xx); added `errorMsg` state + MUI Snackbar to Dashboard and Threads pages; 5 unit tests + 5 Playwright e2e tests; `dev:network` script for LAN access.

## Hotfix — hook parent-repo git remote bleed — ✅ Done (2026-05-25)
Commits: `59b6ac2` → `c34940d`
Summary: Fixed `getGithubUrl` walking up to parent git repo when project is nested (e.g. fluicrm inside agent-os); added `--show-toplevel` guard + `realpathSync` for macOS symlink normalisation; 9 new tests covering getGithubUrl, getThreadId, ensureThreadId.

## Step 7 — finn web background + global install fix — ✅ Done (2026-05-25)
Commits: `ef23c40`
Summary: Fixed `finn web` for global npm install (explicit next binary path), fully detached background mode (stdio redirect + child.unref()), added `finn web status` subcommand, added `prepare` build script, rewrote README install/web docs.

## Step 6 — Thread Lifecycle & Priority — ✅ Done (2026-05-24)
Commits: `7e2d635` → `e7d62ec` (merge `863dfc5`)
Summary: Added thread states (new/open/waiting/blocked/closed/archived), priority field (now/next/later/out), archive/unarchive commands, priority editing UI (badge dropdown + Select in detail), URL-based dashboard routing, 25 API unit tests, 15 Playwright e2e tests, FK migration fix.

## Step 5 — Web Dashboard — ✅ Done (2026-05-23)
Commits: `feat/05-web-dashboard`
Summary: Next.js 15 App Router dashboard at localhost:3141, thread cards with momentum meter, session timeline, insights view, focus warning banner, Playwright e2e tests.

## Step 4 — Install Script — ✅ Done (2026-05-22)
Commits: `feat/04-install`
Summary: curl-installable `install.sh` bootstrap for macOS/Linux.

## Step 3 — Hook Handlers — ✅ Done (2026-05-22)
Commits: `feat/03-hooks`
Summary: Claude Code PostToolUse+Stop hooks, Codex, OpenCode, Git post-commit hook handlers, `finn setup` auto-detection.

## Step 2 — CLI Commands — ✅ Done (2026-05-21)
Commits: `feat/02-cli`
Summary: `finn list/add/next/done/status/sessions/web/touch` with @clack/prompts, chalk, cli-table3.

## Step 1 — Core DB — ✅ Done (2026-05-21)
Commits: `feat/01-core-db`
Summary: Drizzle ORM + better-sqlite3 schema, CRUD functions, WAL mode.

## Hotfix — Thread Location in CLI + Web Dashboard — ✅ Done (2026-05-29)
Commits: `13b6f2c` → `ca34b6d`
Summary: finn list now shows Folder, Repo, Owner columns; ThreadCard shows folder/repo inline; ThreadDetail sidebar shows full project path + clickable GitHub link; Threads page filter state is URL-encoded so Back preserves context; getLatestSessionInfoForThread() replaces the Map round-trip for single-thread lookups; 11 new unit tests added.

## Next Up
Step 11 — TBD (define in next /spec)
