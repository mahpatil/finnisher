## ADDED Requirements

### Requirement: Capture session friction score
The system SHALL capture a `frictionScore` for every session, representing the number of retries or validation loops encountered.

#### Scenario: Hook reports multiple retries
- **WHEN** an agent hook (e.g., Claude Code) reports that 3 retries were needed to pass validation
- **THEN** the session is saved with `frictionScore = 3`

#### Scenario: Default friction score is zero
- **WHEN** a session is created without explicit friction data
- **THEN** it defaults to `frictionScore = 0`

### Requirement: Aggregate friction by activity type
The system SHALL provide an API to calculate average friction rates grouped by activity type (e.g., "Edge Case Handling", "Schema Validation").

#### Scenario: Friction Heatmap data retrieval
- **WHEN** the dashboard requests friction heatmap data
- **THEN** the system returns a list of activities with their respective average `frictionScore` and "Retry Rate" percentage
