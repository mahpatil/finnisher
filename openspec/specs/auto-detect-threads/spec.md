# auto-detect-threads Specification

## Purpose
Enable automatic detection and linking of threads to projects based on GitHub URLs and workspace scanning, eliminating the need for manual `.finn-thread` file creation while maintaining backward compatibility.

## Requirements

### Requirement: Automatic thread detection by GitHub URL
When initializing agent hooks (Claude Code, Codex, OpenCode), the system SHALL attempt to find an existing thread associated with the project's GitHub URL before falling back to `.finn-thread` file lookup.

#### Scenario: Thread exists with matching GitHub URL
- **WHEN** a new session is started in a project with GitHub URL `https://github.com/user/repo`
- **AND** a thread exists in the database with a session that has `githubUrl = "https://github.com/user/repo"`
- **THEN** the system SHALL use that thread's ID for the session
- **AND** the system SHALL NOT create a `.finn-thread` file

#### Scenario: No thread exists with matching GitHub URL
- **WHEN** a new session is started in a project with GitHub URL `https://github.com/user/repo`
- **AND** no thread exists in the database with a session that has `githubUrl = "https://github.com/user/repo"`
- **AND** no `.finn-thread` file exists in the project root
- **THEN** the system SHALL create a new thread for the session
- **AND** the system SHALL create a `.finn-thread` file containing the new thread's ID (backward compatibility)

#### Scenario: .finn-thread file exists (backward compatibility)
- **WHEN** a new session is started in a project
- **AND** a `.finn-thread` file exists in the project root containing a valid thread ID
- **THEN** the system SHALL use that thread ID regardless of GitHub URL matching
- **AND** the system SHALL verify the thread exists in the database

### Requirement: Enhanced getThreadId function
The system SHALL enhance the `getThreadId(cwd: string): string | null` function in `src/hooks/common.ts` to implement the automatic detection logic described above.

#### Scenario: Returns thread ID from GitHub URL match
- **WHEN** called with a project directory that has a GitHub URL
- **AND** no `.finn-thread` file exists
- **AND** a thread exists with a session matching that GitHub URL
- **THEN** returns the matching thread's ID

#### Scenario: Returns thread ID from .finn-thread file
- **WHEN** called with a project directory
- **AND** a `.finn-thread` file exists with a valid thread ID
- **THEN** returns the thread ID from the file (regardless of GitHub URL)

#### Scenario: Returns null when no thread found
- **WHEN** called with a project directory
- **AND** no `.finn-thread` file exists
- **AND** no thread exists with a session matching the GitHub URL
- **THEN** returns null

### Requirement: CLI command for manual thread discovery
The system SHALL provide a `finn discover` command that scans the workspace for projects and suggests thread linkages based on GitHub URLs.

#### Scenario: Discover command lists unlinked projects
- **WHEN** `finn discover` is run
- **AND** there are projects in `~/agent-os/code-workspaces/` without `.finn-thread` files
- **AND** those projects have GitHub URLs
- **THEN** the command lists each project with its GitHub URL and suggests creating a thread

#### Scenario: Discover command can create threads
- **WHEN** `finn discover --create` is run
- **AND** unlinked projects are found
- **THEN** for each project, the command creates a thread titled "[Project Name] Development" and creates a `.finn-thread` file

### Requirement: Database schema unchanged
The system SHALL NOT require changes to the existing database schema for threads or sessions to implement this feature.

#### Scenario: Uses existing sessions table
- **WHEN** implementing GitHub URL matching
- **THEN** the system queries the existing `sessions` table for `github_url` column values
- **AND** joins with the `threads` table to find associated threads

## Implementation Notes

### Hook Initialization Flow
1. When a hook starts (e.g., Claude Code PreToolUse):
   - Call enhanced `getThreadId(cwd)`
   - If returns thread ID: use that thread
   - If returns null: create new thread and save ID to `.finn-thread` file

### getThreadId Enhancement Logic
```typescript
export function getThreadId(cwd: string = process.cwd()): string | null {
  // 1. First check for .finn-thread file (backward compatibility)
  try {
    const fileContent = readFileSync(join(cwd, '.finn-thread'), 'utf8')
    const threadIdFromFile = fileContent.trim()
    if (threadIdFromFile) {
      // Verify thread exists in DB
      const thread = getThreadById(threadIdFromFile) // Assume this helper exists
      if (thread) return threadIdFromFile
    }
  } catch {
    // File doesn't exist or other error - continue to GitHub check
  }

  // 2. Check for GitHub URL match
  const githubUrl = getGithubUrl(cwd)
  if (githubUrl) {
    const matchingThreadId = findThreadIdByGithubUrl(githubUrl) // Assume this helper exists
    if (matchingThreadId) return matchingThreadId
  }

  // 3. No thread found
  return null
}
```

### Helper Functions Needed
- `getThreadById(id: string): Thread | null` - existing function
- `findThreadIdByGithubUrl(url: string): string | null` - new function to implement

### Backward Compatibility
- Existing `.finn-thread` files continue to work as before
- No database changes required
- Existing threads without GitHub URLs in sessions still accessible via `.finn-thread` files