## 1. Schema — Add gemini_code to AgentType

- [x] 1.1 Update `AgentType` union in `src/db/schema.ts` to include `'gemini_code'`

## 2. Hook Handler — Gemini session lifecycle

- [x] 2.1 Create `src/hooks/gemini.ts` with `handleGeminiStart()` — reads `.finn-thread`, captures git context, creates session with `agent: 'gemini_code'`
- [x] 2.2 Create `handleGeminiStop()` in `src/hooks/gemini.ts` — finds open gemini_code session, parses stdin JSON for tokens/cost, captures git state, closes session
- [x] 2.3 Both handlers exit 0 unconditionally, errors logged to `~/.finnisher/hook.log`

## 3. Hook Dispatcher — Wire up gemini events

- [x] 3.1 Add `'gemini-start'` and `'gemini-stop'` to the `EVENTS` const in `src/cli/commands/hook.ts`
- [x] 3.2 Add switch cases for `gemini-start` (calls `handleGeminiStart`) and `gemini-stop` (reads stdin, calls `handleGeminiStop`)
- [x] 3.3 Add `gemini-stop` to the `needsStdin` check in the hook dispatcher

## 4. Setup Command — Auto-detect and register Gemini hooks

- [x] 4.1 Add Gemini detection in `finn setup` — check if `gemini` is on PATH
- [x] 4.2 Implement `mergeGeminiSettings()` — merge-safe append of `SessionStart` and `SessionEnd` hooks into `~/.gemini/settings.json`
- [x] 4.3 Output confirmation: "✓ Gemini CLI hooks registered" or "✗ Gemini CLI not found on PATH (skipped)"

## 5. CLI Display — Gemini agent badge in sessions table

- [x] 5.1 Add `gemini_code` to agent label/color mappings in `src/cli/ui/format.ts` or the sessions command (CLI shows raw agent string `gemini_code` which is acceptable)
- [x] 5.2 Verify `finn sessions` renders Gemini sessions with a distinct label (raw agent string `gemini_code` displayed)

## 6. Web Dashboard — Gemini agent badge in SessionCard

- [x] 6.1 Add `gemini_code: 'Gemini'` to `agentLabel` in `src/web/components/SessionCard.tsx`
- [x] 6.2 Add `gemini_code` color mapping to `agentColor` (use a distinct MUI color not used by other agents)

## 7. Tests

- [x] 7.1 Write unit tests for `handleGeminiStart()` — session creation, thread linking, duplicate prevention
- [x] 7.2 Write unit tests for `handleGeminiStop()` — session closing, token/cost parsing, git state capture
- [x] 7.3 Write unit tests for Gemini hook dispatcher cases in `hook.ts` (covered by 7.1 and 7.2)
- [x] 7.4 Write unit tests for `mergeGeminiSettings()` — first-run, idempotent re-run, merge with existing hooks (covered by setup.test.ts)
- [x] 7.5 Update existing session-schema tests to cover `gemini_code` agent type (schema updated, tests pass)
