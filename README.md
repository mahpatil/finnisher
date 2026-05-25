# Finnisher

> **Turn everything you start into something you finish.**

**Finnisher** is a personal execution momentum tracker. It logs **Threads** (units of outcome) and **Sessions** (AI agent work sessions across Claude Code, Codex, OpenCode) into a local SQLite database — giving you a dashboard of what's moving, what's stalled, and what each agent session actually cost.

---

## Install

### One-liner (macOS / Linux, requires Node ≥ 18)
```bash
curl -fsSL https://raw.githubusercontent.com/mahpatil/finnisher/main/install.sh | sh
```

### npm (direct from GitHub, no registry needed)
```bash
npm install -g github:mahpatil/finnisher
finn setup
```

`finn setup` auto-detects your installed agents (Claude Code, Codex, OpenCode) and registers hooks.

> **Note:** `finn web` currently requires running from the repo checkout (`npm run dev`). Global install support for the web dashboard is coming.

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

# Open the dashboard (from repo checkout)
npm run dev   # → http://localhost:3141

# Or after install (work in progress for global install)
finn web
```

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

Drop a file in any project root to link it to a thread:

```bash
echo "abc123xyz" > .finn-thread
echo ".finn-thread" >> .gitignore   # personal state, don't share
```

All hooks (Claude Code, git, Codex, OpenCode) read this file automatically.

---
### Example
Linking Sessions to Threads
Sessions are automatically linked to threads via the .finn-thread file convention:
1. Create a thread and get its ID:
      ```finn add "Build auth system" --next "Implement OAuth flow"```
   
2. Link your project to that thread:
      echo "abc123xyz" > /path/to/project/.finn-thread
      (Add .finn-thread to .gitignore — it's personal state.)
3. Work normally. When you start a Claude/Codex/OpenCode session in that project:
   - The hook reads .finn-thread via getThreadId() (src/hooks/common.ts:77-84)
   - Creates a session with threadId set to that value
   - On stop, closes the session with tokens, cost, and git state
   - Every git commit also bumps the thread's updatedAt via the post-commit hook
Manual querying:
finn sessions --thread <id>    # Show sessions for a specific thread
The relationship is a nullable FK (sessions.thread_id → threads.id), so sessions can exist unlinked if no .finn-thread file is present.

---

## CLI Reference

| Command | Description |
|---|---|
| `finn setup` | One-time setup, register agent hooks |
| `finn list` | Show active threads + stalled count |
| `finn add` | Add a thread (interactive or `--title`/`--next`) |
| `finn next <id> <action>` | Set next action |
| `finn done <id>` | Mark thread closed |
| `finn status <id> <state>` | Transition state (`new`/`open`/`waiting`/`blocked`/`closed`/`archived`) |
| `finn priority <id> <priority>` | Set priority (`now`/`next`/`later`/`out`) |
| `finn archive <id>` | Archive a thread |
| `finn sessions` | Show recent agent sessions with token + git stats |
| `finn web` | Open dashboard at localhost:3141 |
| `finn touch <id>` | Bump activity (used by hooks) |

---

## Dashboard

`finn web` starts a local Next.js dashboard at **http://localhost:3141**:

| Route | Shows |
|---|---|
| `/` | Overview — velocity chart, stalled alerts, active threads |
| `/threads` | All threads with state + priority filters, archive/unarchive actions |
| `/sessions` | All agent sessions: agent badge, duration, tokens, cost, git state |
| `/insights` | Execution analytics across sessions |
| `/optimization` | Agent optimisation (coming soon) |

Each route is directly navigable via URL. Dashboard polls every 5 seconds — changes from `finn list` / `finn done` reflect automatically. The focus warning banner appears when active thread count exceeds 5.

---

## Agent Hook Integration

Registered automatically by `finn setup`:

| Agent | Hook | What it captures |
|---|---|---|
| **Claude Code** | `PostToolUse` + `Stop` | Token counts, USD cost, session duration |
| **Codex** | `~/.codex/hooks/` | Session start/end |
| **OpenCode** | `~/.opencode/config.json` | Session end |
| **Git** | `post-commit` (per repo) | Bumps thread `updatedAt` on every commit |

---

## Development

```bash
git clone https://github.com/mahpatil/finnisher
cd finnisher
npm install
npm run dev         # Next.js dashboard at http://localhost:3141
npm test            # 145 unit tests
npm run test:e2e    # 18 Playwright e2e tests
npm run build       # TypeScript compile check
```

### Data location

- DB: `~/.finnisher/db.sqlite`
- Hook log: `~/.finnisher/hook.log`

---

## Known Issues

- `finn web` after `npm install -g` doesn't find the Next.js app directory. Use `npm run dev` from the repo for now. Fix tracked in `openspec/changes/finn-web-global-path-fix`.
- Dashboard PATCH errors are silently swallowed — UI recovers on next 5s poll. Fix tracked in `openspec/changes/dashboard-patch-error-handling`.

---

## Philosophy

> Work doesn't fail because it's not tracked. It fails because it **loses momentum**.

Finnisher exists to maintain momentum across sessions, reduce cognitive overhead, and drive completion over starting.
