## MODIFIED Requirements

### Requirement: fin setup auto-detects Gemini CLI
The `finn setup` command SHALL detect Gemini CLI by checking if `gemini` is on PATH, and if found, register hook commands in `~/.gemini/settings.json`.

#### Scenario: Gemini CLI detected on PATH
- **WHEN** `gemini` binary is on PATH and `finn setup --no-auto-detect` is NOT used
- **THEN** hooks are registered in `~/.gemini/settings.json` and output shows "✓ Gemini CLI hooks registered"

#### Scenario: Gemini CLI not detected
- **WHEN** `gemini` binary is not on PATH
- **THEN** output shows "✗ Gemini CLI not found on PATH (skipped)" and no `.gemini/settings.json` is written

### Requirement: CLI sessions table displays Gemini agent badge
The `finn sessions` command and web dashboard SHALL render Gemini sessions with a distinct `gemini_code` agent identifier/badge, visually distinguishable from Claude Code, Codex, and OpenCode badges.

#### Scenario: Gemini session in CLI table
- **WHEN** `finn sessions` is run and a session with `agent = 'gemini_code'` exists
- **THEN** the Agent column displays "Gemini" (or a badge representation) for that row

#### Scenario: Gemini session in web dashboard
- **WHEN** the Sessions tab is loaded and contains `gemini_code` sessions
- **THEN** each Gemini session displays a distinct agent badge/label in the UI
