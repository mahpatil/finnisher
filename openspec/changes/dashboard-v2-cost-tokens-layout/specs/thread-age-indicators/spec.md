## ADDED Requirements

### Requirement: Thread card left border reflects age
Every ThreadCard SHALL render a 4px left border whose colour is determined by `now - thread.updatedAt`:

| Age | Border colour | Hex |
|-----|--------------|-----|
| < 24 hours | Green | `#16a34a` |
| 1–3 days | Yellow | `#ca8a04` |
| 3–7 days | Orange | `#ea580c` |
| > 7 days or `stalled === true` | Red | `#dc2626` |

The border SHALL be applied to all thread cards regardless of which tab they appear on (Active, Waiting, Stalled, Done). Done tab cards use `completedAt` as the reference timestamp instead of `updatedAt`.

#### Scenario: Recently updated thread has green border
- **WHEN** a thread was updated 2 hours ago and is active
- **THEN** its ThreadCard renders with a green left border

#### Scenario: Aging thread has orange border
- **WHEN** a thread was updated 5 days ago
- **THEN** its ThreadCard renders with an orange left border

#### Scenario: Stalled thread has red border regardless of age
- **WHEN** a thread has `stalled === true`
- **THEN** its ThreadCard renders with a red left border even if updated recently

#### Scenario: Done card uses completedAt for border colour
- **WHEN** a done thread has `completedAt` 2 hours ago
- **THEN** its ThreadCard on the Done tab renders with a green border

### Requirement: Thread age helper function
The system SHALL expose a pure `threadBorderColor(updatedAt: string, stalled: boolean, completedAt?: string | null): string` utility function in `src/web/utils/threadAge.ts`. The function SHALL be unit-testable with arbitrary date inputs.

#### Scenario: Helper returns correct colour for each age bracket
- **WHEN** `threadBorderColor` is called with a date 30 minutes ago, not stalled
- **THEN** it returns `#16a34a`

#### Scenario: Stalled flag overrides date
- **WHEN** `threadBorderColor` is called with a date 1 hour ago but `stalled: true`
- **THEN** it returns `#dc2626`
