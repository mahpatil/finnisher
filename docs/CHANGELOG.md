# Changelog

## [Unreleased]

---

### Step 8 — Dashboard PATCH Error Handling (2026-05-25) ✅ APPROVED
**Commits:** `792efa4` → `4d986b5`

**Added**
- `src/web/lib/api.ts` — shared `patchThread` helper that throws on non-2xx with the server's error message (or generic fallback)
- `src/web/lib/__tests__/api.test.ts` — 5 unit tests covering 200 success, request shape, 422 error, unparseable body, network failure
- `e2e/patch-error-handling.spec.ts` — 5 Playwright e2e tests: error Snackbar on 404, auto-dismiss after 4s, manual dismiss, no Snackbar on success, /threads page coverage
- `package.json` — `dev:network` script (`next dev --hostname 0.0.0.0`) for local-network access during development

**Changed**
- `src/web/components/Dashboard.tsx` — removed local `patchThread` duplicate; added `errorMsg` state, try/catch on all 5 action handlers, MUI Snackbar at bottom-centre
- `src/web/app/threads/page.tsx` — same: removed local `patchThread`, added `errorMsg` state + Snackbar

**Tests:** 255 unit + 25 Playwright — all green. (3 pre-existing Gemini setup failures unrelated.)

**Deferred (non-blocking)**
- None

---

### Hotfix — hook parent-repo git remote bleed (2026-05-25) ✅ APPROVED
**Commits:** `59b6ac2` → `c34940d`

**Fixed**
- `src/hooks/common.ts` — `getGithubUrl` now verifies `git rev-parse --show-toplevel` matches `cwd` before reading the remote; prevents projects nested inside another git repo (e.g. `fluicrm` inside `agent-os`) from inheriting the parent's GitHub URL and landing sessions on the wrong thread

**Added**
- `src/hooks/__tests__/common.test.ts` — 9 new tests: `getGithubUrl` parent walk-up (2), `getThreadId` stale id + folder-name fallback (2), `ensureThreadId` full coverage (3), plus 2 nested-repo positive cases

**Tests:** 250 unit — all green (3 pre-existing Gemini setup failures unrelated)

---

### Step 7 — finn web background + global install fix (2026-05-25) ✅ APPROVED
**Commits:** `ef23c40`

**Fixed**
- `src/cli/commands/web.ts` — use explicit `node_modules/.bin/next` path instead of `npx next`; fixes `finn web` after `npm install -g github:mahpatil/finnisher` (next binary not found from `src/web` subdirectory)
- `src/cli/commands/web.ts` — fully detach background process: `stdio: ['ignore', logFd, logFd]` + `child.unref()`; terminal returns immediately, no dangling stdio

**Added**
- `src/cli/commands/web.ts` — `finn web status` subcommand (PID + log path)
- `src/cli/commands/web.ts` — duplicate-start guard (`isRunning()` with signal-0 probe)
- `src/cli/commands/web.ts` — port-based fallback kill in `finn web stop`
- `package.json` — `prepare` script so `dist/` is rebuilt on `npm install -g github:...`
- `README.md` — rewrote Install, Quick Start, Dashboard, and CLI Reference sections; removed stale "requires repo checkout" note; added `finn web status`/`finn web stop` docs; added auto-thread-detection explanation

**Web log:** `~/.finnisher/web.log`

---

### Step 6 — Thread Lifecycle & Priority (2026-05-24) ✅ APPROVED
**Commits:** `7e2d635` → `e7d62ec` (merged `863dfc5`)

**Added**
- `src/db/schema.ts` — thread states (`new`/`open`/`waiting`/`blocked`/`closed`/`archived`), priority field (`now`/`next`/`later`/`out`), `archivedAt` column
- `src/db/migrations/0003_greedy_vector.sql` — schema migration with FK-safe drop/recreate ordering
- `src/cli/commands/archive.ts` — `finn archive <id>` / `finn unarchive <id>` commands
- `src/cli/commands/priority.ts` — `finn priority <id> <priority>` command
- `src/web/app/threads/page.tsx` — `/threads` route with state + priority filter chips, archive/unarchive actions
- `src/web/app/sessions/page.tsx` — `/sessions` route with full LayoutShell
- `src/web/app/insights/page.tsx` — `/insights` route
- `src/web/app/optimization/page.tsx` — `/optimization` route placeholder
- `src/web/components/ThreadCard.tsx` — priority badge clickable dropdown (NOW/NEXT/LATER/OUT menu)
- `src/web/components/ThreadDetail.tsx` — Priority Select control in sidebar
- `src/web/app/api/__tests__/threads.test.ts` — 25 API route unit tests
- `e2e/thread-lifecycle-priority.spec.ts` — 15 Playwright e2e tests

**Changed**
- `src/db/threads.ts` — `updateState` archivedAt handling collapsed to single ternary; added `archiveThread`, `unarchiveThread`, `updatePriority`
- `src/db/migrate.ts` — FK pragma applied at connection level (outside Drizzle transaction) to fix `SQLITE_CONSTRAINT_FOREIGNKEY` on fresh DBs
- `src/web/components/LayoutShell.tsx` — URL-driven nav using `usePathname`/`useRouter`; removed `currentTab`/`onTabChange` props
- `src/web/components/Dashboard.tsx` — overview-only; removed tab state; FocusWarningBanner now rendered
- `src/web/components/FocusWarningBanner.tsx` — callbacks made optional; accepts `sx` prop
- `src/web/app/api/threads/route.ts` — added `momentum` field to `ThreadWithMeta`
- `vitest.config.ts` — added `@db` path alias so API route tests resolve correctly

**Tests:** 243 unit + 15 Playwright — all green. (3 pre-existing Gemini hook failures unrelated to this feature.)

**Deferred (non-blocking)**
- None

---

### Gemini CLI Hooks + OpenCode fix + finn discover (2026-05-05) ✅ DONE
**Source:** `docs/changelog-2026-05-05.md` + `docs/changelog-2026-05-28-autodetect.md`

**Added**
- `src/hooks/gemini.ts` — `handleGeminiStart`/`handleGeminiStop`; tracks sessions with thread linking, tokens, cost, git state
- `src/db/schema.ts` — `gemini_code` added to `AgentType` union
- `src/cli/commands/setup.ts` — auto-detects `gemini` on PATH, registers `SessionStart`/`SessionEnd` in `~/.gemini/settings.json`
- `src/web/components/SessionCard.tsx` — Gemini badge (yellow/warning), human-readable agent labels for all agents
- `src/cli/commands/discover.ts` — scans `~/agent-os/code-workspaces/` for projects; shows linked/unlinked status; `--create` flag auto-creates threads; `--fix` flag verifies links

**Changed**
- `src/hooks/opencode.ts` — replaced broken `after` hook with proper plugin (`session.created`/`session.deleted`); added `handleOpencodeStart()`
- `src/cli/commands/setup.ts` — creates OpenCode plugin at `~/.config/opencode/plugins/finnisher.js`
- `src/cli/commands/hook.ts` — added `opencode-start` event
- `src/cli/commands/sessions.ts` — shows human-readable agent names ("Gemini", "Claude", "Codex", "OpenCode")
- `src/hooks/common.ts` — enhanced `getThreadId()` fallback chain: `.finn-thread` → GitHub URL match → folder name match

**Tests:** 172+ unit (27 new for Gemini/OpenCode/hook dispatch)

---

### Step 5 — Web Dashboard (2026-05-23) ✅ APPROVED
**Commits:** see `feat/05-web-dashboard`

**Added**
- Next.js 15 App Router dashboard at `http://localhost:3141`
- Thread cards with momentum meter, stall detection, next-action inline editing
- Session timeline with agent badges, cost, token counts, git state
- Execution Insights view with per-agent analytics
- Focus warning banner (overload detection)
- Playwright e2e test suite (15 tests)

---

### Step 4 — Install Script (2026-05-22) ✅ APPROVED
**Commits:** see `feat/04-install`

**Added**
- `install.sh` — curl-installable bootstrap for macOS/Linux

---

### Step 3 — Hook Handlers (2026-05-22) ✅ APPROVED
**Commits:** see `feat/03-hooks`

**Added**
- Claude Code `PostToolUse` + `Stop` hooks
- Codex, OpenCode, Git post-commit hook handlers
- `finn setup` auto-detection and hook registration

---

### Step 2 — CLI Commands (2026-05-21) ✅ APPROVED
**Commits:** see `feat/02-cli`

**Added**
- `finn list`, `finn add`, `finn next`, `finn done`, `finn status`, `finn sessions`, `finn web`, `finn touch`
- `@clack/prompts` interactive add flow
- `chalk` + `cli-table3` formatted output

---

### Step 1 — Core DB (2026-05-21) ✅ APPROVED
**Commits:** see `feat/01-core-db`

**Added**
- Drizzle ORM + better-sqlite3 schema (`threads`, `sessions`, `blockers`)
- CRUD functions: `createThread`, `listThreads`, `getThread`, `updateState`, `updateNextAction`, `isStalled`, `overloadWarning`, `listSessions`, `createSession`
- WAL mode, `~/.finnisher/db.sqlite` user-local storage
