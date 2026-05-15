## ADDED Requirements

### Requirement: Thread blocker tracking
The system SHALL support tracking multiple "blockers" for each thread. Each blocker SHALL have a status (CRITICAL, RETRYING, RESOLVED) and a description.

#### Scenario: Add a critical blocker to a thread
- **WHEN** a user or agent adds a blocker "Legacy Token Handler" with level "CRITICAL"
- **THEN** it is associated with the thread and displayed in the UI

### Requirement: Blocker lifecycle management
The system SHALL allow updating the status of a blocker.

#### Scenario: Resolve a blocker
- **WHEN** a blocker's status is updated to "RESOLVED"
- **THEN** it is visually indicated as line-through/dimmed and removed from active counts

### Requirement: Delegate blocker to agent
The system SHALL provide a mechanism to "Delegate" a specific blocker to an agent for resolution.

#### Scenario: Delegate action
- **WHEN** the "Delegate to Agent" action is triggered for a blocker
- **THEN** the system SHALL initialize a new session with the blocker's description as the primary task
