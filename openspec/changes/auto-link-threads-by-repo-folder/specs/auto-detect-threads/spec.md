## MODIFIED Requirements

### Requirement: Enhanced getThreadId function
The system SHALL enhance the `getThreadId(cwd: string): string | null` function in `src/hooks/common.ts` to implement the automatic detection logic described above.

#### Scenario: Returns thread ID from GitHub URL match
- **WHEN** called with a project directory that has a GitHub URL
- **AND** no `.finn-thread` file exists
- **AND** a thread exists with a session matching that GitHub URL
- **THEN** returns the matching thread's ID

#### Scenario: Returns thread ID from folder name match
- **WHEN** called with a project directory
- **AND** no `.finn-thread` file exists
- **AND** no GitHub URL match is found
- **AND** a thread exists with a session matching that folder name
- **THEN** returns the matching thread's ID

#### Scenario: Returns thread ID from .finn-thread file
- **WHEN** called with a project directory
- **AND** a `.finn-thread` file exists with a valid thread ID
- **THEN** returns the thread ID from the file (regardless of GitHub URL)

#### Scenario: Returns null when no thread found
- **WHEN** called with a project directory
- **AND** no `.finn-thread` file exists
- **AND** no matching thread is found by GitHub URL or folder name
- **THEN** returns null

### Requirement: CLI command for manual thread discovery
The system SHALL provide a `finn discover` command that scans the workspace for projects and suggests thread linkages based on GitHub URLs and folder names.

#### Scenario: Discover command lists unlinked projects
- **WHEN** `finn discover` is run
- **AND** there are projects in `~/agent-os/code-workspaces/` without `.finn-thread` files
- **AND** those projects have GitHub URLs OR match existing thread folder names
- **THEN** the command lists each project with its matching metadata and suggests creating a thread

#### Scenario: Discover command can create threads
- **WHEN** `finn discover --create` is run
- **AND** unlinked projects are found
- **THEN** for each project, the command creates a thread titled "[Project Name] Development" and creates a `.finn-thread` file
