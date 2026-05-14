## ADDED Requirements

### Requirement: API marks abandoned sessions as ghost
The system SHALL compute `isGhost: boolean` for every session returned by `GET /api/sessions`. A session is a ghost when `endedAt === null AND (now - startedAt) > 4 hours`. Ghost detection is computed at read time; no DB writes occur.

#### Scenario: Old unclosed session is ghost
- **WHEN** `GET /api/sessions` is called and a session has `endedAt = null` with `startedAt` more than 4 hours ago
- **THEN** the response includes `isGhost: true` for that session

#### Scenario: Recently started unclosed session is not ghost
- **WHEN** `GET /api/sessions` is called and a session has `endedAt = null` with `startedAt` less than 4 hours ago
- **THEN** the response includes `isGhost: false` for that session

#### Scenario: Closed session is never ghost
- **WHEN** `GET /api/sessions` is called and a session has a non-null `endedAt`
- **THEN** the response includes `isGhost: false` regardless of `startedAt`

### Requirement: Dashboard shows Abandoned badge for ghost sessions
The SessionCard component SHALL render a grey "Abandoned" chip in place of the green "● running" indicator when `session.isGhost === true`.

#### Scenario: Ghost session card shows Abandoned badge
- **WHEN** the Sessions tab renders a card where `isGhost === true`
- **THEN** the card displays a grey chip with text "Abandoned" and does NOT show the green "● running" text

#### Scenario: Active running session shows running indicator
- **WHEN** the Sessions tab renders a card where `endedAt === null` and `isGhost === false`
- **THEN** the card displays the green "● running" indicator as before
