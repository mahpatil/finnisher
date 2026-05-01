# Finnisher — MVP Implementation Plan

## Context
Building a personal execution tracking system focused on outcome momentum. Tracks **Threads** (units of outcome) + **Sessions** (agent work sessions across Claude Code, Codex, OpenCode). Max 5 active threads enforced. Two interfaces: CLI (`finn`) + web dashboard. Dead-simple install for all users (single curl command or npm global).

---

## Architecture

**Single npm package `finnisher`** (no monorepo — keeps install trivial)
```
finnisher/
├── src/
│   ├── db/           # Schema, migrations, CRUD
│   ├── cli/          # Commander commands
│   ├── web/          # Next.js app (served by finn web)
│   └── hooks/        # Hook handlers for each agent
├── package.json      # bin: { finn: ./dist/cli/index.js }
└── install.sh        # Curl-installable bootstrap script
```

**Data:** `~/.finnisher/db.sqlite` — shared by CLI and web server (WAL mode).

---

## Data Model

### Threads
```
id · title · state (active/waiting/blocked/done) · nextAction (NOT NULL)
owner (you/ai_agent/other) · notes · createdAt · updatedAt · completedAt
```

### Sessions
```
id · threadId (nullable FK) · agent (claude_code/codex/opencode/manual)
startedAt · endedAt · tokensIn · tokensOut · costUsd
gitBranch · lastCommitSha · lastCommitMsg · unpushedCount
openFiles (JSON) · projectPath
```

**Business rules:**
- 5 active threads = focus ideal — system warns but never blocks; warning severity escalates with count
- `overloadWarning(count)` returns null (≤5), yellow caution (6–8), red urgent (9+) with prioritization suggestions
- Stalled: `Date.now() - updatedAt > 48h` — computed at read time, no daemon
- All hooks exit 0 — never block Claude or git

---

## CLI Commands

| Command | Behavior |
|---|---|
| `finn setup` | Create DB, detect agents, register hooks |
| `finn list` | Active threads + stalled count |
| `finn add` | Interactive: title → next action → owner → state |
| `finn next <id> <action>` | Update next action, bump updatedAt |
| `finn done <id>` | Mark complete, show time-to-completion |
| `finn status <id> <state>` | Transition state (validates 5-limit) |
| `finn web` | Start dashboard at localhost:3141 |
| `finn sessions [--thread <id>]` | Recent sessions with token + git stats |
| `finn touch <id>` | Silent bump (hooks only, always exits 0) |

---

## Installation

### curl (non-technical users)
```bash
curl -fsSL https://raw.githubusercontent.com/mahpatil/finnisher/main/install.sh | sh
```

### npm
```bash
npm install -g finnisher && finn setup
```

`finn setup` detects installed agents and auto-registers hooks.

---

## Hook System

**.finn-thread convention:** File in project root containing a thread ID — all hooks read this to know which thread to touch.

| Agent | Hook mechanism | Data captured |
|---|---|---|
| Claude Code | `~/.claude/settings.json` PostToolUse + Stop | tokens, cost, git state |
| Codex | `~/.codex/hooks/` | session start/end |
| OpenCode | `~/.opencode/config.json` after hook | session end |
| Git | `post-commit` per repo | bumps thread updatedAt |

---

## Web Dashboard (finn web → localhost:3141)

5 tabs:
1. **Active** — max 5, sorted updatedAt ASC (neglected floats top)
2. **Waiting** — waiting/blocked threads
3. **Stalled** — non-done threads with no activity 48h+
4. **Done** — last 30 completed, sorted by completedAt DESC
5. **Sessions** — all agent sessions: agent badge, duration, tokens/cost, branch, last commit, unpushed count

SWR polling at 5s — CLI updates visible in browser immediately.

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `drizzle-orm` + `better-sqlite3` | ORM + synchronous SQLite |
| `drizzle-kit` | Migration generation |
| `nanoid` | Short IDs (10 chars) |
| `commander` | CLI arg parsing |
| `@clack/prompts` | Interactive `finn add` |
| `chalk` + `cli-table3` | Terminal output |
| `next@15` + `react@19` | Web dashboard |
| `tailwindcss@4` + `shadcn` | Tabs, Card, Badge, Button |
| `swr` | Data fetching + polling |

---

## Implementation Sequence

**Phase 1 — Core DB**
- [ ] `package.json`, `tsconfig.json`
- [ ] `src/db/schema.ts` — threads + sessions tables
- [ ] `src/db/threads.ts` + `src/db/sessions.ts` — CRUD + business rules
- [ ] `drizzle-kit generate` → migration SQL
- [ ] `src/db/migrate.ts` — lazy migration runner

**Phase 2 — CLI**
- [ ] `src/cli/index.ts` — Commander entry, runs migrations
- [ ] All commands: setup → list → add → done → next → status → touch → sessions → web
- [ ] `npm link` for global install
- [ ] Smoke test all commands

**Phase 3 — Hooks**
- [ ] `src/hooks/` — claude-stop, codex-start/stop, opencode-stop handlers
- [ ] `finn setup` — agent detection + auto-registration
- [ ] `install.sh` — curl bootstrap script
- [ ] End-to-end test: Claude session → session row created

**Phase 4 — Web**
- [ ] Next.js scaffold in `src/web/`
- [ ] API routes: `/api/threads`, `/api/sessions`
- [ ] 5-tab dashboard with SWR polling
- [ ] Session cards with agent icon + git stats

**Phase 5 — Polish**
- [ ] `finn sessions --open` — currently running sessions
- [ ] `finn stats` — weekly summary
- [ ] `.gitignore` entry for `.finn-thread`
