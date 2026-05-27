# Finnisher

> **Turn everything you start into something you finish.**

**Finnisher** is a personal execution momentum tracker. It logs **Threads** (units of outcome) and **Sessions** (AI agent work sessions across Claude Code, Codex, OpenCode, and Gemini CLI) into a local SQLite database — giving you a dashboard of what's moving, what's stalled, and what each agent session actually cost.

---

## Install

```bash
npm install -g github:mahpatil/finnisher
finn setup
```

`finn setup` auto-detects your installed agents (Claude Code, Codex, OpenCode, Gemini CLI) and registers hooks.

---

## Quick Start

```bash
# Add a thread
finn add

# See what's active
finn list

# Update the next action
finn next abc123xyz "Write the intro paragraph"

# Mark it done
finn done abc123xyz

# Start the web dashboard in the background
finn web                    # → starts at http://localhost:3141
finn web status             # → check if it's running
finn web stop               # → stop it
```

The dashboard runs as a background process — your terminal returns immediately. Logs go to `~/.finnisher/web.log`.

---

## Core Concepts

### Threads

A **thread** = a unit of outcome. Not a task list — a meaningful goal with a clear next action.

| Field | Description |
|---|---|
| `title` | What you're trying to finish |
| `state` | `new` / `open` / `waiting` / `blocked` / `closed` / `archived` |
| `priority` | `now` / `next` / `later` / `out` — colour-coded sequencing |
| `nextAction` | The single executable next step (mandatory) |
| `owner` | `you` / `ai_agent` / `other` |

**States:** `new` and `open` are active; `waiting`/`blocked` are parked; `closed` is done; `archived` is out of sight. Archive any closed thread to keep the list clean.

**Priority:** sequences what to work on next. `now` (red) → `next` (orange) → `later` (blue) → `out` (grey, deprioritised). Change priority via the badge dropdown on any thread card or the Priority selector in the thread detail view.

**Focus rule:** 5 active threads is the ideal. The system warns at 6–8 (yellow) and urges action at 9+ (red) — but never blocks you from adding more.

### Auto-detected threads

When you start a Claude Code, Codex, OpenCode, or Gemini CLI session in a project that has no `.finn-thread` file, Finnisher automatically creates a thread for that project and writes a `.finn-thread` file so all subsequent sessions link to the same thread. The auto-created thread gets a generic title (`<folder> Development`) — update it with:

```bash
finn next <id> "actual next action"
```

### Sessions

Every AI agent session is logged automatically:

| Field | Captured |
|---|---|
| Agent | Claude Code / Codex / OpenCode |
| Duration | Start → end time |
| Tokens | Input + output + USD cost |
| Git state | Branch, last commit, unpushed changes |
| Folder | Project folder name + GitHub URL |
| Thread link | Which thread this session belonged to |

### `.finn-thread` convention

Drop a file in any project root to link it to a specific thread:

```bash
echo "abc123xyz" > .finn-thread
echo ".finn-thread" >> .gitignore   # personal state, don't share
```

All hooks (Claude Code, Codex, OpenCode, Gemini, git) read this file automatically. If no `.finn-thread` file exists, the hook creates one automatically.

---

## CLI Reference

| Command | Description |
|---|---|
| `finn setup` | One-time setup, register agent hooks |
| `finn list` | Show active threads + stalled count |
| `finn list --archived` | Show archived threads |
| `finn list --state waiting` | Filter by state |
| `finn add` | Add a thread (interactive or `--title`/`--next`) |
| `finn next <id> <action>` | Set next action |
| `finn done <id>` | Mark thread closed |
| `finn status <id> <state>` | Transition state (`new`/`open`/`waiting`/`blocked`/`closed`/`archived`) |
| `finn priority <id> <priority>` | Set priority (`now`/`next`/`later`/`out`) |
| `finn archive <id>` | Archive a thread |
| `finn unarchive <id>` | Unarchive a thread |
| `finn sessions` | Show recent agent sessions with token + git stats |
| `finn intent "<text>"` | Set goal text on the active session for the current directory |
| `finn launch <id>` | Manage launch criteria (definition of done) for a thread |
| `finn launch <id> --check <N>` | Toggle criterion N checked/unchecked |
| `finn week` | Weekly execution summary: shipped, hours, cost, todos, sprint candidates |
| `finn week --json` | Same as `finn week` but as machine-readable JSON |
| `finn day` | Same as `finn week` but scoped to today |
| `finn discover` | Scan workspace for projects and show thread linkage status |
| `finn discover --create` | Auto-create threads for unlinked projects |
| `finn discover --fix` | Verify existing links and suggest corrections |
| `finn web` | Start the web dashboard in the background |
| `finn web status` | Check if the dashboard is running |
| `finn web stop` | Stop the running dashboard |
| `finn touch <id>` | Bump activity (used by hooks) |

---

## Dashboard

`finn web` starts a local Next.js dashboard at **http://localhost:3141** in the background:

| Route | Shows |
|---|---|
| `/` | Overview — velocity chart, stalled alerts, active threads |
| `/threads` | All threads with state + priority filters, archive/unarchive actions |
| `/sessions` | All agent sessions: agent badge, duration, tokens, cost, git state |
| `/insights` | Execution analytics across sessions |
| `/optimization` | Agent optimisation (coming soon) |

Each route is directly navigable via URL. Dashboard polls every 5 seconds — changes from `finn list` / `finn done` reflect automatically. The focus warning banner appears when active thread count exceeds 5. If a dashboard action fails (network error, invalid state), a brief error notification appears at the bottom of the screen and auto-dismisses after 4 seconds.

### Responsive layout

The dashboard is usable on mobile (375px+) and desktop:

- **Mobile (< 600px):** the sidebar is hidden by default; a hamburger icon in the AppBar opens it as a full-height overlay. Tap any nav item to navigate and auto-close the drawer.
- **Desktop (≥ 900px):** the sidebar is permanently visible. A chevron button at the bottom collapses it to icon-only width (~56px) to reclaim screen space; click again to restore full width.

### Priority card highlights

Thread cards are colour-accented by priority so `NOW` and `NEXT` items stand out at a glance:

| Priority | Left border colour |
|---|---|
| `now` | Red (`#f44336`) |
| `next` | Orange (`#ff9800`) |
| `later` / `out` | None (or stalled border if stalled) |

### Completion signal and Sprint Candidates

Finnisher computes a **completion percentage** for every thread at read time using four weighted signals:

```
completionPct =
    (todos_done / todos_total) * 0.4          // 0 if no todos
  + (sessions_last_7d >= 3 ? 0.2 : 0)
  + (blockers_open === 0 ? 0.2 : 0)
  + (launch_criteria_met / launch_criteria_total) * 0.2  // 0 if no criteria
```

Threads with `completionPct >= 0.75` appear in an amber **Sprint Candidates** section at the top of the dashboard and show a `[~DONE]` badge in `finn list`. Threads with all launch criteria checked show `[READY]`.

### Launch Gate

Each thread can have a **Launch Gate** — a short checklist defining what "shipping" means for that specific thread.

```bash
finn launch <id>            # interactive: add 1–5 criteria via prompts
finn launch <id> --check 2  # toggle criterion 2 checked/unchecked
```

When all criteria are checked, `finn list` shows `[READY]` next to the thread. Running `finn done <id>` with unchecked criteria prints a warning listing the unmet items but still closes the thread (warn-only, never blocks). The Launch Gate section is also visible in the thread detail view on the dashboard with checkboxes that persist across reloads.

### Session intent

Tag the active session with a goal so you remember what you were trying to accomplish:

```bash
finn intent "Fix the login bug before standup"
```

Matches the open session in the current directory (most recent if multiple). Intent appears in `finn sessions` (truncated to 30 chars) and below the cost/token line in each session card on the dashboard.

### Abandon prevention

When `finn add` is run interactively and 2 or more threads haven't been touched in over 48 hours, Finnisher shows a **stall interrupt** before the add prompt — listing the stalest threads and asking "Any of these closer to done than your new idea?" Select a stalled thread to get `finn next` refocus guidance, or choose "Proceed" to continue adding. Flag mode (`--title`/`--next`) bypasses the interrupt. The stall threshold is configurable in `~/.finnisher/config.json` via `stall_hours` (default: 48).

### Weekly and daily summary

```bash
finn week     # summary of the current week: shipped, sessions, cost, todos, closest to done, stalled
finn week --json   # same data as JSON for scripting
finn day      # same summary scoped to today
```

Output includes the week date range, threads closed, session count + hours tracked, AI cost, todos checked, up to 3 threads closest to shipping, stalled threads sorted by staleness, and a motivational closing line.

### Thread todos

Each thread has a lightweight checklist in its detail view:

- Open any thread → scroll to the **Todos** section below the session timeline.
- Type a todo and press **Enter** (or click **+**) to add it as an unchecked item.
- Click the checkbox to mark it done (strikethrough) — persists across page reload.
- Hover a todo to reveal **edit** (pencil) and **delete** (trash) icons.
- The thread card shows a `done/total ✓` chip when the thread has any todos; the chip turns green when all are complete.

```bash
finn web            # start in background, returns to shell immediately
finn web status     # Running (PID 1234) → http://localhost:3141
finn web stop       # stop the server
```

Logs: `~/.finnisher/web.log`

---

## Agent Hook Integration

Registered automatically by `finn setup`:

| Agent | Hook | What it captures |
|---|---|---|
| **Claude Code** | `PostToolUse` + `Stop` | Token counts, USD cost, session duration |
| **Codex** | `~/.codex/hooks/` | Session start/end |
| **OpenCode** | `~/.config/opencode/plugins/finnisher.js` | Session start/end (`session.created`/`session.deleted`) |
| **Gemini CLI** | `~/.gemini/settings.json` `SessionStart`/`SessionEnd` | Session start/end, tokens, cost, git state |
| **Git** | `post-commit` (per repo) | Bumps thread `updatedAt` on every commit |

Session cards show human-readable agent labels ("Claude", "Codex", "OpenCode", "Gemini") with colour-coded badges.

---

## Development

```bash
git clone https://github.com/mahpatil/finnisher
cd finnisher
npm install
npm run dev         # Next.js dashboard at http://localhost:3141 (dev mode, localhost only)
npm run dev:network # dev mode accessible on your local network (binds 0.0.0.0:3141)
npm test            # unit tests
npm run test:e2e    # Playwright e2e tests
npm run build       # TypeScript compile
```

### Data location

- DB: `~/.finnisher/db.sqlite`
- Hook log: `~/.finnisher/hook.log`
- Web log: `~/.finnisher/web.log`

---

## Philosophy

> Work doesn't fail because it's not tracked. It fails because it **loses momentum**.

Finnisher exists to maintain momentum across sessions, reduce cognitive overhead, and drive completion over starting.
