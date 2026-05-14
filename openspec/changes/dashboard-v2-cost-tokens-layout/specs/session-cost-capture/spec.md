## ADDED Requirements

### Requirement: Stop hook persists cost and token data
When the Claude Stop hook fires, the system SHALL read `totalCostUSD`, `tokensIn`, and `tokensOut` from the stdin JSON payload and write them to the matching session row identified by `sessionId`. The session's `endedAt` SHALL be set to the current timestamp at the same time.

#### Scenario: Stop hook with full cost payload
- **WHEN** the Claude Stop hook fires with stdin `{ "sessionId": "abc", "totalCostUSD": 0.12, "tokensIn": 1500, "tokensOut": 800 }`
- **THEN** the session row with id `abc` has `costUsd = 0.12`, `tokensIn = 1500`, `tokensOut = 800`, and `endedAt` set to a non-null timestamp

#### Scenario: Stop hook with missing cost fields
- **WHEN** the Claude Stop hook fires with stdin `{ "sessionId": "abc" }` (no cost fields)
- **THEN** the session row is updated with `endedAt` set but `costUsd`, `tokensIn`, `tokensOut` remain `null`

#### Scenario: Stop hook with unknown sessionId
- **WHEN** the Claude Stop hook fires with a `sessionId` that does not exist in the DB
- **THEN** the hook exits 0 without throwing and logs a warning to `~/.finnisher/hook.log`

### Requirement: updateSession function in DB layer
The system SHALL expose `updateSession(id: string, patch: { costUsd?: number | null, tokensIn?: number | null, tokensOut?: number | null, endedAt?: Date | null })` in `src/db/sessions.ts`. It SHALL perform a partial UPDATE touching only the provided fields and always set `updatedAt` to `now`.

#### Scenario: Partial patch only updates provided fields
- **WHEN** `updateSession("abc", { costUsd: 0.05 })` is called
- **THEN** only `costUsd` and `updatedAt` are modified; all other columns remain unchanged

#### Scenario: Function is a no-op for unknown id
- **WHEN** `updateSession("nonexistent", { costUsd: 0.05 })` is called
- **THEN** no error is thrown and no rows are affected
