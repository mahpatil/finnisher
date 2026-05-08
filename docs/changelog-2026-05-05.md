# Changelog — 2026-05-05

## Add Gemini CLI Hooks

Finnisher now tracks Gemini CLI sessions alongside Claude Code, Codex, and OpenCode.

### New
- `src/hooks/gemini.ts` — `handleGeminiStart()` creates sessions with thread linking via `.finn-thread`, `handleGeminiStop()` closes sessions and captures token/cost/git data
- `src/db/schema.ts` — added `gemini_code` to `AgentType` union
- `src/cli/commands/setup.ts` — auto-detects `gemini` on PATH, registers `SessionStart`/`SessionEnd` hooks in `~/.gemini/settings.json`
- `src/web/components/SessionCard.tsx` — Gemini badge (warning/yellow color), human-readable label "Gemini"

## Fix OpenCode Session Tracking

OpenCode sessions were never created — only a broken `after` hook existed that fired on every LLM response. Replaced with a proper OpenCode plugin.

### Changed
- `src/hooks/opencode.ts` — added `handleOpencodeStart()`, updated `handleOpencodeStop()` to accept `cwd`
- `src/cli/commands/hook.ts` — added `opencode-start` event
- `src/cli/commands/setup.ts` — removes old `after` hook from `~/.opencode/config.json`, creates plugin at `~/.config/opencode/plugins/finnisher.js` using `session.created`/`session.deleted` events

## CLI Improvements

- `src/cli/ui/format.ts` — added `agentLabel()` for human-readable agent names in session table
- `src/cli/commands/sessions.ts` — shows "Gemini", "Claude", "Codex", "OpenCode" instead of raw agent type

## Web UI Improvements

- `src/web/components/SessionCard.tsx` — added session start date + time display, end time for completed sessions

## Tests

- 27 new tests (172 total, all passing)
- `src/hooks/__tests__/gemini.test.ts` — 12 tests for Gemini hooks
- `src/hooks/__tests__/opencode.test.ts` — tests for new start handler
- `src/cli/__tests__/hook.test.ts` — tests for opencode-start dispatch
- `src/cli/__tests__/setup.test.ts` — tests for Gemini and OpenCode plugin registration
