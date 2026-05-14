## ADDED Requirements

### Requirement: Analytics API endpoint
The system SHALL expose `GET /api/analytics` returning an `AnalyticsData` object computed from SQLite aggregate queries across the threads and sessions tables. The endpoint SHALL run migrations at module level and return a 200 response. All nullable fields SHALL be `null` when insufficient data exists (not 0 or omitted).

The response shape:
- `completionRate: number` — `done_count / total_count` (0 if no threads)
- `threadsClosedThisWeek: number` — threads with `completedAt` in last 7 days
- `avgLifetimeDays: number | null` — avg `(completedAt - createdAt) / 86400000` for done threads
- `avgSessionsPerCompletedThread: number | null` — avg sessions linked to done threads
- `sessionsThisWeek: number` — sessions with `startedAt` in last 7 days
- `costThisWeek: number | null` — sum of `costUsd` for sessions this week (null if all null)
- `totalCostAllTime: number | null` — sum of all `costUsd`
- `avgTokenEfficiency: number | null` — avg `tokensOut/tokensIn` for sessions where both are non-null
- `cleanSessionRate: number | null` — % sessions with `unpushedCount = 0` (null if no unpushed data)
- `avgNextActionWords: number` — avg word count of `nextAction` on non-done threads
- `currentStreak: number` — consecutive calendar days (ending today) with ≥1 session
- `activeThreadCount: number` — count of threads with state `active`
- `topProjectThisWeek: { folderName: string; sessionCount: number } | null` — top `folderName` by session count this week

#### Scenario: Full data returns all fields
- **WHEN** `GET /api/analytics` is called with threads and sessions in the DB
- **THEN** response is 200 with a valid `AnalyticsData` object where all non-nullable fields are numbers

#### Scenario: No threads or sessions returns safe defaults
- **WHEN** `GET /api/analytics` is called with an empty DB
- **THEN** `completionRate: 0`, `activeThreadCount: 0`, `currentStreak: 0`, nullable fields are null

#### Scenario: Streak calculation is calendar-day based
- **WHEN** there are sessions on days Mon, Tue, Wed (today) but not Thu last week
- **THEN** `currentStreak: 3`

#### Scenario: Token efficiency excludes sessions with null tokens
- **WHEN** some sessions have null tokensIn or tokensOut
- **THEN** `avgTokenEfficiency` is computed only from sessions where both are non-null

### Requirement: SummaryPanel component always visible above tabs
The system SHALL render a `SummaryPanel` component between the page header and the tab bar. It SHALL fetch from `GET /api/analytics` via SWR with a 30-second refresh interval. It SHALL display the following metrics in a compact single-row layout:

| Slot | Label | Value | Notes |
|------|-------|-------|-------|
| 1 | Done | `71%` | completion rate as % |
| 2 | This week | `3↓ · 12⚡ · $2.40` | closed threads · sessions · cost |
| 3 | Avg lifetime | `4.2d` | null shows `—` |
| 4 | Efficiency | `1.8×` | token efficiency; null shows `—` |
| 5 | Streak | `🔥 3d` | consecutive days; 0 shows `—` |
| 6 | Focus | `2/5 ████░░` | active count with mini progress bar |

Metrics with null values SHALL display `—`. The panel SHALL never block rendering of the tab content below.

#### Scenario: Panel renders with no data
- **WHEN** the analytics API returns all-null optional fields
- **THEN** the SummaryPanel renders with `—` for null slots, no errors, no empty space

#### Scenario: Panel shows real values after hook fix
- **WHEN** a new Claude session ends and Stop hook writes cost data
- **THEN** within 30 seconds the SummaryPanel reflects the updated cost

#### Scenario: Panel focus slot turns red when over limit
- **WHEN** `activeThreadCount >= 9`
- **THEN** the focus slot displays in red colour (matching the urgency banner threshold)

#### Scenario: Panel focus slot is neutral when at or under limit
- **WHEN** `activeThreadCount <= 5`
- **THEN** the focus slot displays in green or neutral colour

### Requirement: nextAction specificity signal on thread cards
Thread cards for non-done threads SHALL display a subtle amber indicator when `nextAction` word count is ≤ 2. The indicator SHALL be a small dot or icon with a tooltip reading "Next action may be too vague — add more detail for better AI outcomes". It SHALL NOT block editing or any action.

#### Scenario: Vague nextAction shows indicator
- **WHEN** a thread has `nextAction: "fix bug"`
- **THEN** the ThreadCard shows a subtle amber indicator

#### Scenario: Specific nextAction shows no indicator
- **WHEN** a thread has `nextAction: "Refactor the auth middleware to use JWT instead of sessions"`
- **THEN** no amber indicator is shown

#### Scenario: Indicator is not shown on Done tab cards
- **WHEN** a done thread has a short nextAction
- **THEN** no indicator is rendered (done threads need no further action)
