## ADDED Requirements

### Requirement: API returns per-thread session aggregates
`GET /api/threads` SHALL include three computed fields on every `ThreadWithMeta` object:
- `sessionCount: number` — total sessions linked to this thread (0 if none)
- `lastAgent: string | null` — the `agent` value from the most recent session by `startedAt` (null if no sessions)
- `totalCostUsd: number | null` — sum of `costUsd` for all sessions linked to this thread (null if no sessions have cost data; 0 if sessions exist but all have null cost)

These are computed via SQLite aggregate queries on the sessions table joined by `threadId`.

#### Scenario: Thread with linked sessions returns stats
- **WHEN** `GET /api/threads` is called and a thread has 3 linked sessions with costs 0.05, 0.10, null
- **THEN** the thread has `sessionCount: 3`, `totalCostUsd: 0.15`, and `lastAgent` set to the agent of the most recent session

#### Scenario: Thread with no linked sessions returns zero/null stats
- **WHEN** `GET /api/threads` is called and a thread has no linked sessions
- **THEN** the thread has `sessionCount: 0`, `lastAgent: null`, `totalCostUsd: null`

#### Scenario: Thread with sessions but no cost data
- **WHEN** `GET /api/threads` is called and a thread has 2 sessions both with `costUsd = null`
- **THEN** the thread has `sessionCount: 2`, `totalCostUsd: null`, and `lastAgent` set

### Requirement: ThreadCard displays session stats and relative timestamp
The ThreadCard component SHALL render a stats row below the owner badge showing:
- Session count, last agent label, and total cost formatted as `$X.XX` when available
- Relative `updatedAt` time ("updated 2h ago", "updated 3 days ago") using a `timeAgo()` helper

When `sessionCount === 0`, the stats row SHALL be omitted entirely (no empty placeholder).
When `totalCostUsd === null`, cost is omitted from the stats row.

#### Scenario: Thread card with full stats
- **WHEN** a ThreadCard renders with `sessionCount: 5`, `lastAgent: "claude_code"`, `totalCostUsd: 0.48`
- **THEN** the card shows text containing "5 sessions", "Claude", and "$0.48"

#### Scenario: Thread card with no sessions hides stats row
- **WHEN** a ThreadCard renders with `sessionCount: 0`
- **THEN** no stats row is rendered on the card

#### Scenario: Thread card shows relative updated time
- **WHEN** a ThreadCard renders with `updatedAt` 3 hours ago
- **THEN** the card displays "updated 3h ago" or similar relative text

### Requirement: Contextual date shown on Waiting and Done cards
- Waiting tab cards SHALL display "waiting X days" computed from `updatedAt` (the time the thread entered waiting state, used as proxy).
- Done tab cards SHALL display the `completedAt` date formatted as "Done [Month D]" (e.g., "Done May 3").

#### Scenario: Waiting card shows waiting duration
- **WHEN** a thread card renders in the Waiting tab with `updatedAt` 4 days ago
- **THEN** the card shows "waiting 4 days"

#### Scenario: Done card shows completion date
- **WHEN** a thread card renders in the Done tab with `completedAt: "2026-05-03T10:00:00Z"`
- **THEN** the card shows "Done May 3"
