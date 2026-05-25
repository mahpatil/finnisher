# Finnisher — Project Progress

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

## Next Up
Step 7 — Global install fix for `finn web` + dashboard PATCH error handling (tracked in openspec/changes/)
