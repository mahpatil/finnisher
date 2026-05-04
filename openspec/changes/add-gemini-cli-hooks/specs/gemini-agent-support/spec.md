## ADDED Requirements

### Requirement: Gemini CLI hooks create and close sessions
The system SHALL create a new session when Gemini CLI starts and close it when Gemini CLI exits, using the `SessionStart` and `SessionEnd` lifecycle events configured in `~/.gemini/settings.json`.

#### Scenario: Session created on Gemini CLI start
- **WHEN** a user starts Gemini CLI in a project directory containing `.finn-thread` with value `abc123xyz`
- **THEN** a new session is created with `agent = 'gemini_code'`, `threadId = 'abc123xyz'`, and `projectPath` set to the current directory

#### Scenario: No duplicate sessions for same project
- **WHEN** Gemini CLI is already running with an open `gemini_code` session for the same `projectPath`
- **THEN** no new session is created

#### Scenario: Session closed on Gemini CLI exit
- **WHEN** Gemini CLI exits normally
- **THEN** the open `gemini_code` session for that `projectPath` is closed with `endedAt` set and any available token/cost data

#### Scenario: Session closed without thread link
- **WHEN** Gemini CLI starts in a project directory without `.finn-thread`
- **THEN** a session is created with `agent = 'gemini_code'` and `threadId = null`

### Requirement: Gemini hook handlers exit 0 unconditionally
The `handleGeminiStart()` and `handleGeminiStop()` functions SHALL catch all errors, log them to `~/.finnisher/hook.log`, and never throw to the caller.

#### Scenario: Error during Gemini session creation
- **WHEN** `handleGeminiStart()` encounters a database write error
- **THEN** the error is logged to `hook.log` and the function returns without throwing

#### Scenario: Invalid JSON in Gemini stop payload
- **WHEN** `handleGeminiStop()` receives non-JSON input on stdin
- **THEN** the error is logged to `hook.log`, token/cost fields remain null, and the session is still closed

### Requirement: Gemini hook commands available in hook dispatcher
The `finn hook` command SHALL accept `gemini-start` and `gemini-stop` as valid event types.

#### Scenario: gemini-start event dispatches correctly
- **WHEN** `finn hook gemini-start --cwd /path/to/project` is executed
- **THEN** `handleGeminiStart()` is called with the provided working directory

#### Scenario: gemini-stop event dispatches correctly
- **WHEN** `finn hook gemini-stop --cwd /path/to/project` is executed with JSON payload on stdin
- **THEN** `handleGeminiStop()` is called with the stdin payload and working directory

#### Scenario: unknown gemini event is logged
- **WHEN** `finn hook gemini-unknown` is executed
- **THEN** the unknown event is logged to `hook.log`

### Requirement: Gemini hooks registered during fin setup
When `finn setup` detects Gemini CLI on PATH, it SHALL register `SessionStart` and `SessionEnd` hooks in `~/.gemini/settings.json` using a merge-safe append pattern.

#### Scenario: Gemini detected and hooks registered
- **WHEN** `gemini` is on PATH and `finn setup` is run
- **THEN** `~/.gemini/settings.json` contains `SessionStart` and `SessionEnd` hooks calling `finn hook gemini-start` and `finn hook gemini-stop`

#### Scenario: Hooks not duplicated on re-run
- **WHEN** `finn setup` is run a second time with Gemini already configured
- **THEN** no duplicate hook entries are added to `~/.gemini/settings.json`

#### Scenario: Gemini not found
- **WHEN** `gemini` is not on PATH and `finn setup` is run
- **THEN** the setup outputs "✗ Gemini CLI not found on PATH (skipped)"

### Requirement: Capture thread ID and git context for Gemini sessions
Gemini session creation SHALL read `.finn-thread` from the project directory and capture `folderName` and `githubUrl` using the same helpers as other agents.

#### Scenario: Thread ID read from .finn-thread
- **WHEN** `handleGeminiStart()` is called for a project with `.finn-thread` containing `xyz789abc`
- **THEN** the session is created with `threadId = 'xyz789abc'`

#### Scenario: Git context captured
- **WHEN** `handleGeminiStart()` is called in a git repo with remote origin
- **THEN** `folderName` and `githubUrl` are set on the session

#### Scenario: Non-git project
- **WHEN** `handleGeminiStart()` is called in a directory without git
- **THEN** `folderName` is set from the path basename and `githubUrl` is null
