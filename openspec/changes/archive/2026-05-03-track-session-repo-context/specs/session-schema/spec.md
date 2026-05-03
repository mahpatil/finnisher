## ADDED Requirements

### Requirement: sessions table has folder_name column
The `sessions` table SHALL include a nullable `folder_name` TEXT column.

#### Scenario: Column exists after migration
- **WHEN** `runMigrations()` is called on a fresh or existing database
- **THEN** the `sessions` table contains a `folder_name` column that accepts TEXT or NULL

#### Scenario: Existing sessions unaffected
- **WHEN** a migration is applied to a database that already has session rows
- **THEN** existing rows have `folder_name = NULL` and no data is lost

### Requirement: sessions table has github_url column
The `sessions` table SHALL include a nullable `github_url` TEXT column.

#### Scenario: Column exists after migration
- **WHEN** `runMigrations()` is called
- **THEN** the `sessions` table contains a `github_url` column that accepts TEXT or NULL

#### Scenario: createSession accepts github_url and folder_name
- **WHEN** `createSession({ …, folderName: "finnisher", githubUrl: "https://github.com/mahpatil/finnisher" })` is called
- **THEN** the session is persisted with those values and returned correctly

#### Scenario: createSession with nulls for both new fields
- **WHEN** `createSession({ …, folderName: null, githubUrl: null })` is called
- **THEN** the session is persisted without error
