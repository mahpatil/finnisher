## ADDED Requirements

### Requirement: sessions table has agent_id column
The `sessions` table SHALL include a nullable `agent_id` TEXT column to store the name of the agent (e.g., "Claude-3.5", "Codex-V4").

#### Scenario: Column added
- **WHEN** migrations run
- **THEN** `agent_id` column is available

### Requirement: sessions table has token metrics columns
The `sessions` table SHALL include nullable INTEGER columns `tokens_in` and `tokens_out`.

#### Scenario: Metrics stored
- **WHEN** a session completes with 1000 input tokens and 500 output tokens
- **THEN** these values are persisted in the database

### Requirement: sessions table has cost column
The `sessions` table SHALL include a nullable REAL column `cost` to store the monetary cost of the session.

#### Scenario: Cost captured
- **WHEN** a session completes
- **THEN** the monetary cost (e.g., 0.0421) is stored

### Requirement: sessions table has friction and effort columns
The `sessions` table SHALL include nullable columns `friction_score` (INTEGER) and `effort_type` (TEXT).

#### Scenario: Effort type and friction stored
- **WHEN** a session is created with `friction_score = 3` and `effort_type = "debugging"`
- **THEN** these values are persisted correctly

### Requirement: threads table has momentum and stalled columns
The `threads` table SHALL include `momentum` (INTEGER, 0-100) and `stalled` (BOOLEAN).

#### Scenario: Thread metadata updated
- **WHEN** momentum is calculated as 84%
- **THEN** the `threads` table is updated with this value
