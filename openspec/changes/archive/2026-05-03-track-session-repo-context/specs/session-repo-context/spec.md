## ADDED Requirements

### Requirement: Capture folder name at session start
The system SHALL store the basename of the project path as `folderName` on every new session.

#### Scenario: Hook captures folder name from cwd
- **WHEN** a new session is created with `projectPath = "/Users/mahesh/projects/finnisher"`
- **THEN** `folderName` is stored as `"finnisher"`

#### Scenario: No project path provided
- **WHEN** `projectPath` is null or undefined at session creation
- **THEN** `folderName` is stored as null

### Requirement: Capture GitHub URL at session start
The system SHALL resolve the git remote origin URL and normalise it to HTTPS format, storing it as `githubUrl` on the session.

#### Scenario: HTTPS remote origin
- **WHEN** `git remote get-url origin` returns `https://github.com/mahpatil/finnisher.git`
- **THEN** `githubUrl` is stored as `"https://github.com/mahpatil/finnisher"`

#### Scenario: SSH remote origin
- **WHEN** `git remote get-url origin` returns `git@github.com:mahpatil/finnisher.git`
- **THEN** `githubUrl` is stored as `"https://github.com/mahpatil/finnisher"`

#### Scenario: No git remote or not a git repo
- **WHEN** `git remote get-url origin` exits with non-zero or the directory is not a git repo
- **THEN** `githubUrl` is stored as null and no error is thrown

### Requirement: getGithubUrl helper available in common hooks module
The system SHALL export `getGithubUrl(cwd: string): string | null` from `src/hooks/common.ts`.

#### Scenario: Returns normalised URL
- **WHEN** called with a valid git repo directory
- **THEN** returns an HTTPS GitHub URL with no `.git` suffix

#### Scenario: Returns null on failure
- **WHEN** called with a non-repo directory or when git is not on PATH
- **THEN** returns null without throwing

### Requirement: CLI sessions output includes folder name and GitHub URL
The system SHALL display `folderName` and `githubUrl` in the `finn sessions` table.

#### Scenario: Session with both fields populated
- **WHEN** `finn sessions` is run
- **THEN** the table includes a `Folder` column showing `folderName` and a `Repo` column showing the GitHub URL (truncated if needed)

#### Scenario: Session with null fields
- **WHEN** a session has null `folderName` or `githubUrl`
- **THEN** those cells display `"—"`
