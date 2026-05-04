## Why

Gemini CLI now has a full hook system (enabled by default since Jan 2026) with `SessionStart` and `SessionEnd` lifecycle events, but Finnisher has no Gemini support. Users who work with Gemini see their sessions silently ignored — no session created, no thread touched, no cost tracked. Adding Gemini hook parity ensures every AI agent session is captured regardless of which tool the user is in.

## What Changes

- Add `gemini_code` as a valid `AgentType` in the session schema
- Create `src/hooks/gemini.ts` with `handleGeminiStart()` and `handleGeminiStop()` handlers
- Add `gemini-start` and `gemini-stop` events to the hook dispatcher
- Auto-detect Gemini CLI in `finn setup` and register hooks in `.gemini/settings.json`
- Update `finn sessions` CLI output and web dashboard to display Gemini sessions with an agent badge

## Capabilities

### New Capabilities
- `gemini-agent-support`: End-to-end Gemini CLI hook integration — session lifecycle tracking, thread linking via `.finn-thread`, auto-registration in `finn setup`, and dashboard visibility

### Modified Capabilities
- `session-schema`: Add `gemini_code` to the `AgentType` union type
- `session-repo-context`: Extend agent detection in setup and session display to include Gemini

## Impact

- `src/db/schema.ts` — one new agent type in union
- `src/hooks/gemini.ts` — new file, follows same pattern as claude-code.ts / codex.ts
- `src/cli/commands/hook.ts` — two new event cases in switch
- `src/cli/commands/setup.ts` — Gemini auto-detection + `.gemini/settings.json` merge logic
- `src/cli/ui/format.ts` — session table may need Gemini badge/color
- Web dashboard session tab — agent badge component to render Gemini
