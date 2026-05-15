## ADDED Requirements

### Requirement: Thread momentum meter
The system SHALL calculate a thread's completion percentage (Momentum) based on satisfied requirements or manual user updates.

#### Scenario: Thread progress calculation
- **WHEN** a thread is updated with new task completions
- **THEN** its momentum percentage is recalculated and returned (e.g., 84%)

### Requirement: Stalled thread detection
The system SHALL identify threads as "STALLED" if no session has been recorded for more than 24 hours.

#### Scenario: Stalled project alert
- **WHEN** more than 24 hours pass since the last session for an active thread
- **THEN** the thread is flagged as stalled in the dashboard with a "No session in [Time]" indicator

### Requirement: Velocity tracking
The system SHALL track "Execution Velocity" (operations per second or sessions per day) across all active threads.

#### Scenario: Velocity history visualization
- **WHEN** the dashboard renders
- **THEN** it displays a 7-day velocity history chart with separate tracks for different resource metrics
