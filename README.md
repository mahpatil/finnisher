# Finnisher

> **Turn everything you start into something you finish.**

Finnisher is a personal execution tracking system that monitors **threads of work** — from intent through execution to completion — across all your AI coding agents (Claude Code, Codex, OpenCode).

---

## The Problem

Work doesn't fail because it's not tracked. It fails because it **loses momentum**.

- Tasks scattered across tools
- Sessions started but never finished
- No clear view of what's moving, what's stuck

## The Solution

Finnisher tracks **Threads** (units of outcome) + **Sessions** (agent work sessions) and enforces completion discipline with a hard limit of **5 active threads**.

---

## Install

### One-liner (macOS / Linux)
```bash
curl -fsSL https://raw.githubusercontent.com/mahpatil/finnisher/main/install.sh | sh
```

### npm
```bash
npm install -g finnisher
finn setup
```

`finn setup` auto-detects your installed agents (Claude Code, Codex, OpenCode) and registers hooks.

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

# Open the dashboard
finn web   # → http://localhost:3141
```

---

## Core Concepts

### Threads
A **thread** = a unit of outcome. Not a task list — a meaningful goal that should be finished.

| Field | Description |
|---|---|
| `title` | What you're trying to finish |
| `state` | `active` / `waiting` / `blocked` / `done` |
| `nextAction` | The single executable next step (mandatory) |
| `owner` | You / AI Agent / Other |

**Rule:** Max **5 active threads**. Everything else is parked.

### Sessions
Every time you open an AI coding agent, Finnisher logs a session:

| Field | Captured |
|---|---|
| Agent | Claude Code / Codex / OpenCode |
| Duration | Start → end time |
| Tokens | Input + output + cost |
| Git state | Branch, last commit, unpushed changes |
| Thread link | Which thread this session belonged to |

### `.finn-thread` convention
Drop a file in any project root to link it to a thread:

```bash
echo "abc123xyz" > .finn-thread
```

All hooks read this file — Claude Code, git commits, all of it.

---

## CLI Reference

| Command | Description |
|---|---|
| `finn setup` | One-time setup, register agent hooks |
| `finn list` | Show active threads + stalled count |
| `finn add` | Add a thread (interactive) |
| `finn next <id> <action>` | Set next action |
| `finn done <id>` | Mark thread complete |
| `finn status <id> <state>` | Transition state |
| `finn sessions` | Show recent agent sessions |
| `finn web` | Open dashboard at localhost:3141 |
| `finn touch <id>` | Bump activity (used by hooks) |

---

## Dashboard

`finn web` starts a local Next.js dashboard with 5 views:

1. **Active** — your current 5 threads, neglected ones float to top
2. **Waiting** — blocked on someone/something
3. **Stalled** — no activity in 48h+
4. **Done** — completed threads
5. **Sessions** — all agent sessions with token costs and git state

---

## Agent Hook Integration

Hooks are registered automatically by `finn setup`. They capture:

- **Claude Code** — PostToolUse + Stop hooks → token counts, cost, session data
- **Codex** — `~/.codex/hooks/` → session start/end
- **OpenCode** — `~/.opencode/config.json` → session end
- **Git** — `post-commit` hook → bumps thread activity on every commit

---

## Philosophy

> "Work doesn't fail because it's not tracked. It fails because it loses momentum."

Finnisher exists to:
- Maintain momentum across sessions
- Reduce cognitive load
- Drive completion over starting
