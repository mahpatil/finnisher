## ADDED Requirements

### Requirement: OpenCode plugin creates sessions on session.created
The system SHALL create a new session when OpenCode fires the `session.created` event, reading `.finn-thread` from the project directory to link the session to a thread.

#### Scenario: Session created with thread link
- **WHEN** OpenCode starts in a project with `.finn-thread` containing `abc123xyz`
- **THEN** a new session is created with `agent = 'opencode'`, `threadId = 'abc123xyz'`, and `projectPath` set to the current directory

#### Scenario: No duplicate sessions for same project
- **WHEN** OpenCode already has an open `opencode` session for the same `projectPath`
- **THEN** no new session is created

#### Scenario: Session created without thread link
- **WHEN** OpenCode starts in a project directory without `.finn-thread`
- **THEN** a session is created with `agent = 'opencode'` and `threadId = null`

### Requirement: OpenCode plugin closes sessions on session.deleted
The system SHALL close the open OpenCode session when OpenCode fires the `session.deleted` event, capturing git state (branch, commit SHA, unpushed count).

#### Scenario: Session closed with git state
- **WHEN** OpenCode exits after working in a git repo
- **THEN** the open `opencode` session is closed with `endedAt`, `gitBranch`, `lastCommitSha`, `lastCommitMsg`, and `unpushedCount`

#### Scenario: Session closed without git
- **WHEN** OpenCode exits in a non-git directory
- **THEN** the session is closed with `endedAt` and git fields set to null

### Requirement: OpenCode plugin file deployed by fin setup
When `finn setup` detects OpenCode on PATH, it SHALL create a plugin file at `~/.config/opencode/plugins/finnisher.js` that subscribes to `session.created` and `session.deleted` events and dispatches to `finn hook opencode-start` and `finn hook opencode-stop`.

#### Scenario: Plugin file created on setup
- **WHEN** `opencode` is on PATH and `finn setup` is run
- **THEN** `~/.config/opencode/plugins/finnisher.js` exists and contains `session.created` and `session.deleted` handlers

#### Scenario: Plugin not duplicated on re-run
- **WHEN** `finn setup` is run with the plugin already installed
- **THEN** the existing plugin file is not overwritten or duplicated

#### Scenario: Broken after hook removed
- **WHEN** `finn setup` detects an `after` hook in `~/.opencode/config.json` matching the Finnisher command
- **THEN** the `after` key is removed from config.json to prevent double-firing

#### Scenario: OpenCode not found
- **WHEN** `opencode` is not on PATH
- **THEN** setup outputs "✗ OpenCode not found on PATH (skipped)"

### Requirement: Hook dispatcher supports opencode-start event
The `finn hook` command SHALL accept `opencode-start` as a valid event type, calling `handleOpencodeStart()`.

#### Scenario: opencode-start creates session
- **WHEN** `finn hook opencode-start --cwd /path/to/project` is executed
- **THEN** `handleOpencodeStart()` creates a session with `agent = 'opencode'` for the given directory

## MODIFIED Requirements

### Requirement: OpenCode stop handler uses cwd for project path
The `handleOpencodeStop()` function SHALL accept a `cwd` parameter to determine the project path for git state capture, replacing the current behavior of relying solely on `openSession.projectPath`.

#### Scenario: Stop handler receives cwd
- **WHEN** `handleOpencodeStop(cwd)` is called with a project directory
- **THEN** git state is captured from that directory
