## Context

Finnisher currently supports three AI agents: Claude Code, Codex, and OpenCode. Each has hook handlers (`src/hooks/claude-code.ts`, `src/hooks/codex.ts`, `src/hooks/opencode.ts`) that create/close sessions and link them to threads via `.finn-thread`. Gemini CLI gained a comprehensive hook system in Dec 2025, enabled by default in Jan 2026. The hooks use a `.gemini/settings.json` config with the same structural pattern as Claude Code's `~/.claude/settings.json` — a `hooks` object mapping event names to arrays of `{ matcher, hooks: [{ type: "command", command: "..." }] }`.

The `sessions` table's `agent` column is typed as `AgentType`, a union limited to `claude_code | codex | opencode | manual`. Gemini CLI binary is `gemini` (installable via npm).

## Goals / Non-Goals

**Goals:**
- Capture Gemini sessions with the same fidelity as Claude Code (start, end, tokens, cost, git state, thread link)
- Auto-register hooks in `finn setup` when Gemini is detected on PATH
- Display Gemini sessions in CLI and web dashboard with a distinct agent badge
- Maintain the "all hooks exit 0" reliability guarantee

**Non-Goals:**
- No support for Gemini Code Assist (VS Code extension) — only Gemini CLI
- No migration of existing sessions to add agent type
- No changes to the database schema beyond the AgentType union extension

## Decisions

### Decision: Agent type name is `gemini_code`
Rationale: Matches the existing naming convention (`claude_code`, `codex`, `opencode`). The binary is `gemini` but the full product name is "Gemini CLI" — `gemini_code` is consistent with `claude_code` and avoids ambiguity with other Gemini tools.

### Decision: Hook registration via `.gemini/settings.json` merge (project-level)
Rationale: Gemini CLI supports project-level `.gemini/settings.json` and user-level `~/.gemini/settings.json`. Following the Claude Code pattern, Finnisher will write to the user-level `~/.gemini/settings.json` during `finn setup`. This gives cross-project coverage. Project-level `.finn-thread` files still control thread linking per-repo.

### Decision: Use `SessionStart` and `SessionEnd` lifecycle events
Rationale: Gemini CLI provides `SessionStart` (fires on startup/resume/clear) and `SessionEnd` (fires on exit/clear). These map directly to session create/close. Unlike Claude Code's `PostToolUse` (per-tool), Gemini's `SessionStart` fires once per session — cleaner lifecycle. `SessionEnd` is "best effort" (CLI won't wait) but still fires reliably on normal exit.

### Decision: Gemini stop hook receives cost/token data via stdin JSON
Rationale: Gemini CLI hooks communicate via stdin JSON with the same pattern as Claude Code. The exact field names may differ — the handler will accept multiple formats and log raw payloads for debugging. If Gemini doesn't provide token data, those fields stay null (already supported by the schema).

### Decision: No separate gemini-start event — use existing pattern
Rationale: Both `gemini-start` and `gemini-stop` are new events in the hook dispatcher. The `SessionStart` hook fires before any agent interaction, so `gemini-start` creates the session. The `SessionEnd` hook fires on exit, so `gemini-stop` closes it with whatever data is available.

## Risks / Trade-offs

- **[Gemini hook event names may change]** → Gemini's hook system is relatively new (feature tracked in GitHub issues as recently as Feb 2026). Mitigation: Use the documented stable event names (`SessionStart`, `SessionEnd`) and log the raw event for debugging. The hook dispatcher can be updated quickly if names change.
- **[SessionEnd may not fire on crash]** → Gemini docs state `SessionEnd` is "best effort" and won't block shutdown. If Gemini crashes, the session stays open. Mitigation: Same as existing agents — `getOpenSessions()` finds dangling sessions; user can close manually or the next session creation detects same `projectPath` + `agent`.
- **[Token/cost format unknown]** → Gemini CLI may send different JSON field names than Claude Code. Mitigation: Accept multiple formats, log raw payload on first run, update handler once real payloads are observed.
- **[User-level `.gemini/settings.json` merge complexity]** → Gemini supports multiple config scopes (project, user, system, extension). Writing to user-level may conflict with extension-level hooks. Mitigation: Use merge-safe append pattern (same as Claude Code) — only add hooks that don't already exist by checking command string equality.
