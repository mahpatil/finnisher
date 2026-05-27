# Finnisher v1.0 — "The Finisher" Release Roadmap

> **Mission:** Turn Finnisher from a session tracker into a project completion engine — the tool that helps you ship the last 20% of every AI-started project.

Current version: **v0.2.0** (tracking + dashboard foundation complete)  
Target release: **v1.0.0** — OSS launch ready

---

## North Star

You use AI to start 10 projects. You finish 2. Finnisher exists for the other 8.

Every feature in this roadmap exists to answer one question: **did you ship it, or did you abandon it?**

---

## Release Plan

```
v0.3  —  Finish Engine         (project completion mechanics)
v0.4  —  Daily Driver          (habit loop + review tools)
v0.5  —  MCP + Skill Layer     (AI-native review workflows)
v1.0  —  OSS Launch            (polish, publish, land page)
```

---

## v0.3 — Finish Engine

> Make the tool understand what "done" looks like and help you get there.

### F1 — Launch Gate (Definition of Done per thread)

**Problem:** Todos exist but there's no concept of *launch criteria*. A thread with 8/10 todos done looks the same as one that's barely started.

**Solution:** Each thread gets a `launchCriteria` field — a required answer to "What does shipping this look like?" Separate from todos (which are tasks), launch criteria are outcome gates (e.g. "deployed to prod", "posted publicly", "first user signed up").

- Schema: `launchCriteria text` on `threads`
- CLI: `finn launch <id>` — set/view launch criteria interactively
- Dashboard: "Launch Gate" section in thread detail — distinct from todos, each criterion is a checkbox
- When all criteria are checked: thread gets a "SHIP IT" state and a green launch banner
- `finn list` shows `[READY]` badge on threads with all criteria met

**Acceptance criteria:**
- `finn launch <id>` prompts for criteria if none set, shows current if set
- Thread detail shows Launch Gate section below todos
- All-criteria-met triggers visual state change + CLI banner
- `finn done <id>` with unmet criteria shows a warning (not a block)

---

### F2 — Last 20% Detection

**Problem:** The `momentum` and `lastVelocity` schema fields exist but are invisible and unused in the UI.

**Solution:** Auto-badge threads that look close to done. The system computes a "completion signal" from observable facts: todo ratio, session recency, blocker count, time since last touch, launch criteria checked.

**Completion Signal formula (heuristic):**
```
signal = (todos_done / todos_total) * 0.4
       + (sessions_last_7d > 2 ? 0.2 : 0)
       + (blockers_open === 0 ? 0.2 : 0)
       + (launch_criteria_met / launch_criteria_total) * 0.2
```

- `completionPct` computed field on thread list API (not stored, computed at read time)
- Dashboard: threads with `completionPct >= 0.75` get a "Last 20% — Sprint to finish" badge
- Distinct amber/gold colour treatment to make them visually pop
- `finn list` shows a `[~DONE]` indicator next to these threads
- Separate "Sprint Candidates" section at top of dashboard

---

### F3 — Abandon Prevention at Add Time

**Problem:** Focus warning exists but it's passive. You can dismiss it and keep adding.

**Solution:** Active friction when adding a thread while stalled threads exist. Show stalled threads *before* completing the add flow and ask: "Is any of these closer to done than your new idea?"

- `finn add` — before prompting for new thread details, if 2+ stalled threads exist: show them in a table with "any of these closer to done?" prompt
- User can pick one to work on instead (jumps to `finn next <id>`) or proceed with the new thread
- "Proceed anyway" still works — no blocking, just friction
- Stall threshold configurable in `~/.finnisher/config.json` (default: 48h)

---

### F4 — Session Intent

**Problem:** Sessions are logged but there's no record of what you *intended* to achieve. You can't tell if a session moved a project forward.

**Solution:** Optional 1-line intent captured at session start, displayed in the session log.

- Schema: `intent text` on `sessions`
- Hook: at session start, if a thread is linked, prompt "What's the goal for this session?" (skippable with Enter)
- Dashboard: session log shows intent alongside cost/tokens
- `finn sessions` CLI shows intent column

---

### F5 — `finn week` — Weekly Shipping Summary

**Problem:** No signal for "did I actually ship anything this week?"

**Solution:** `finn week` CLI command — a motivational summary of the last 7 days.

```
$ finn week

  Week of May 19–25, 2026

  Shipped ✓         2 threads closed
  Sessions          14  (47 hrs tracked)
  AI cost           $4.23
  Todos checked     31 / 38

  Closest to done:
    [~DONE] fluicrm — 8/10 todos, last touched 2h ago
    [~DONE] blog-redesign — all criteria met, ready to ship

  Stalled (>48h):
    [STALL] podcast-notes — last touched 6 days ago
    [STALL] advent-of-rust — last touched 12 days ago

  Ship something this week. You're close on fluicrm.
```

- Plain terminal output, no dependencies beyond what's already there
- `finn week --json` for machine-readable output (used by MCP layer)
- `finn day` alias for a daily version of the same summary

---

## v0.4 — Daily Driver

> Make Finnisher part of your daily ritual, not something you check occasionally.

### D1 — `finn day` — Daily Briefing

Single command that answers "what should I work on today?"

```
$ finn day

  Good morning. 3 active threads.

  FOCUS NOW:
  → fluicrm [now] — last touched 2h ago
    Next: Wire up the invoice PDF export
    4/5 todos done · 1 launch criterion unmet: "first invoice sent"

  CHECK IN:
  → blog-redesign [next] — last touched 1d ago
  → finnisher [next] — last touched 3h ago

  Stalled (move or close):
  → podcast-notes — 6 days since last touch
```

- Reads from local DB, no network calls, instant
- Shows only actionable threads (excludes `waiting`, `blocked`, `archived`)
- Ordered: `now` → `next` → `later`, stalled threads at bottom
- Runs in <200ms

---

### D2 — Stall Nudge (local notification)

When `finn day` or `finn list` is run and a thread has been stalled for >72h, emit an OS notification (macOS: `osascript`, Linux: `notify-send`). No daemon needed — triggered on CLI use.

- `finn notify` as a standalone command to check and send
- Configurable threshold in `~/.finnisher/config.json`
- Opt-out via `finn config set stall_notify false`

---

### D3 — `finn config` — User Preferences

Thin config layer so users can tune behaviour without editing files.

```bash
finn config set stall_hours 72        # stall threshold
finn config set focus_limit 5         # max active threads
finn config set stall_notify true     # OS nudges
finn config get stall_hours
finn config list
```

- Config stored in `~/.finnisher/config.json`
- All configurable values have safe defaults (no config required to run)

---

## v0.5 — MCP + Skill Layer

> Make Finnisher available as an AI-native tool — so your AI agent can review your projects with you, not just track them passively.

### M1 — Finnisher MCP Server

An MCP server (`finn mcp`) that exposes Finnisher data as tools an AI agent (Claude, Cursor, etc.) can call natively during a session.

**Tools exposed:**
```
finnisher_list_threads       → active threads with completion signal
finnisher_get_thread(id)     → full thread detail: todos, criteria, sessions
finnisher_daily_brief        → same output as `finn day`, structured JSON
finnisher_weekly_summary     → same as `finn week --json`
finnisher_sprint_candidates  → threads with completionPct >= 0.75
finnisher_add_thread(...)    → create a new thread
finnisher_close_thread(id)   → mark done
finnisher_next_action(id, a) → update next action
```

**Setup:**
```bash
finn mcp                    # starts the MCP server (stdio transport)
```

Register in Claude Code settings:
```json
{
  "mcpServers": {
    "finnisher": {
      "command": "finn",
      "args": ["mcp"]
    }
  }
}
```

`finn setup` auto-adds this entry when it detects Claude Code.

---

### M2 — Review Skill (Claude Code Skill)

A `.claude/skills/finnisher-review/SKILL.md` skill that uses the MCP tools to run structured reviews.

**Triggers:** `/finnisher-review`, `/finn-day`, `/finn-week`

**Daily review flow (`/finn-day`):**
1. Calls `finnisher_daily_brief` via MCP
2. Presents focused view: what to work on today
3. Asks: "Do you want to update any next actions or close anything?"
4. Applies changes back via MCP tools

**Weekly review flow (`/finn-week`):**
1. Calls `finnisher_weekly_summary` + `finnisher_sprint_candidates`
2. Generates a structured weekly retrospective:
   - What shipped
   - What stalled and why
   - Top sprint candidate to focus on
   - Suggested "close or kill" list for threads you haven't touched in 2+ weeks
3. Offers to update thread states based on review

**Sprint planning flow (`/finn-sprint`):**
1. Shows all "Last 20%" candidates
2. Picks one to sprint on
3. Sets it to `priority: now`, updates next action
4. Runs `finn day` to confirm focus

---

### M3 — Gemini / OpenCode Skill Parity

Mirror the Claude Code skill as a Gemini CLI skill and OpenCode skill — same review flows, same MCP backend. Since the MCP server is agent-agnostic, only the skill wrapper differs per agent.

---

## v1.0 — OSS Launch

> Ship it publicly. Make it the go-to tool for developers who use AI and want to actually finish things.

### O1 — npm Publish

- Publish to npm as `finnisher` (check availability, fallback: `@mahpatil/finnisher`)
- Install changes from `npm install -g github:mahpatil/finnisher` → `npm install -g finnisher`
- CI workflow: tag-triggered npm publish via `NPM_TOKEN` secret
- Semantic versioning enforced

### O2 — README Rewrite (Problem-First)

Lead with the problem, not the feature list.

```markdown
# Finnisher

You use AI to start 10 projects. You finish 2. Finnisher is for the other 8.

It tracks every AI session across Claude Code, Codex, Gemini CLI, and OpenCode — 
and tells you which of your projects is closest to done.
```

Sections:
- The problem (the "last 20%")
- 30-second install + demo GIF
- Core concepts (threads, sessions, launch gate)
- Daily workflow (`finn day` → work → `finn week`)
- MCP setup for AI-assisted review
- CLI reference
- Contributing

### O3 — Landing Page

Simple one-page site (`finnisher.dev` or GitHub Pages on the repo). Single scroll:
- Headline: "The last 20% is where projects die."
- Screenshot/GIF of dashboard + `finn day` output
- Install command (one-liner)
- 3 core features: track sessions / launch gate / daily brief
- Link to GitHub

Built as a static HTML file in `docs/site/index.html` (same pattern as `finnisher_designs/`).

### O4 — OSS Hygiene

- `LICENSE` — MIT
- `CONTRIBUTING.md` — how to file issues, branch/PR convention, test requirements
- GitHub issue templates: Bug Report, Feature Request, "I abandoned a project and need help finishing it"
- GitHub Actions: CI on PR (build + test), npm publish on tag
- `SECURITY.md` — responsible disclosure (local-only tool, low surface area)
- Code of conduct

### O5 — Demo Data + Onboarding

New users have an empty DB — nothing to look at. Make `finn setup` optionally seed demo threads and a demo session so the dashboard has something to show immediately.

```bash
$ finn setup
→ Detected: Claude Code, Gemini CLI
→ Hooks registered
→ Seed demo data? (y/N) y
→ Created 3 demo threads — run `finn web` to see the dashboard
```

---

## Feature Summary Table

| ID | Feature | Version | Effort | Impact |
|----|---------|---------|--------|--------|
| F1 | Launch Gate | v0.3 | M | High |
| F2 | Last 20% Detection | v0.3 | S | High |
| F3 | Abandon Prevention at Add | v0.3 | S | High |
| F4 | Session Intent | v0.3 | S | Medium |
| F5 | `finn week` summary | v0.3 | M | High |
| D1 | `finn day` briefing | v0.4 | M | High |
| D2 | Stall nudge (OS notify) | v0.4 | S | Medium |
| D3 | `finn config` | v0.4 | S | Low |
| M1 | MCP server (`finn mcp`) | v0.5 | L | High |
| M2 | Review skill (Claude Code) | v0.5 | M | High |
| M3 | Gemini/OpenCode skill parity | v0.5 | S | Medium |
| O1 | npm publish | v1.0 | S | High |
| O2 | README rewrite | v1.0 | S | High |
| O3 | Landing page | v1.0 | M | High |
| O4 | OSS hygiene (license, CI, templates) | v1.0 | S | Medium |
| O5 | Demo data + onboarding | v1.0 | S | High |

**Effort:** S = < 1 day · M = 1–2 days · L = 3+ days

---

## Implementation Order

Start with v0.3 — the Finish Engine. Without it, the MCP layer and OSS launch don't have a compelling story. The sequence matters:

```
F3 (abandon prevention) → F1 (launch gate) → F2 (last 20% detection)
                                            ↓
F4 (session intent) → F5 (finn week) → D1 (finn day)
                                            ↓
M1 (MCP server) → M2 (review skill) → O1-O5 (OSS launch)
```

Each step makes the one after it more valuable.

---

*Last updated: 2026-05-27*
