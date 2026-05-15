## ADDED Requirements

### Requirement: Thread matching by folder name
The system SHALL attempt to link a new session to an existing thread if the session's `folderName` matches the `folderName` of any previous session in that thread.

#### Scenario: Match found by folder name
- **WHEN** a new session is started in folder "finnisher"
- **AND** no matching GitHub URL is found
- **AND** a thread exists with a session where `folderName = "finnisher"`
- **THEN** the system SHALL use that thread's ID for the new session

#### Scenario: Multiple threads match folder name
- **WHEN** multiple threads have sessions with the same `folderName`
- **THEN** the system SHALL select the most recently updated thread

### Requirement: Database helper for folder name lookup
The database layer SHALL provide a function to find a thread ID by folder name.

#### Scenario: findThreadIdByFolderName returns valid ID
- **WHEN** `findThreadIdByFolderName("finnisher")` is called
- **AND** a matching thread exists
- **THEN** it returns the ID of that thread

### Requirement: CLI Discover command uses folder names
The `finn discover` command SHALL suggest linking projects to threads based on folder name matches.

#### Scenario: Discover suggests link by folder name
- **WHEN** `finn discover` is run
- **AND** a project folder exists without a `.finn-thread` file
- **AND** a thread in the database has a session with a matching folder name
- **THEN** the command SHALL suggest linking the folder to that thread
