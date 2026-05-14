## ADDED Requirements

### Requirement: SessionCard shows token efficiency ratio
When a session has non-null `tokensIn` and `tokensOut`, the SessionCard SHALL display a token efficiency chip showing `{ratio}× leverage` where `ratio = (tokensOut / tokensIn).toFixed(1)`. The chip colour SHALL reflect the ratio:

| Ratio | Colour | Meaning |
|-------|--------|---------|
| ≥ 1.5 | Green | Good leverage — model generating substantial output |
| 0.5–1.5 | Default/grey | Balanced |
| < 0.5 | Amber | Low leverage — consider tightening prompt |

When both fields are null (before the hook fix ships) no chip SHALL be shown.

#### Scenario: High efficiency session shows green chip
- **WHEN** a session has `tokensIn: 500` and `tokensOut: 900`
- **THEN** the SessionCard shows a green chip reading "1.8× leverage"

#### Scenario: Low efficiency session shows amber chip
- **WHEN** a session has `tokensIn: 1000` and `tokensOut: 300`
- **THEN** the SessionCard shows an amber chip reading "0.3× leverage"

#### Scenario: Session with null tokens shows no chip
- **WHEN** a session has `tokensIn: null`
- **THEN** no efficiency chip is shown

### Requirement: SessionCard shows commit completeness badge
When a session has a non-null `unpushedCount`, the SessionCard SHALL render a commit completeness indicator:
- `unpushedCount === 0`: green `✓ clean` badge — all work committed and pushed
- `unpushedCount > 0`: amber `↑{N} unpushed` badge — there is uncommitted work at session end

When `unpushedCount` is null no badge is shown.

#### Scenario: Clean session shows green badge
- **WHEN** a session has `unpushedCount: 0`
- **THEN** the SessionCard shows a green `✓ clean` badge

#### Scenario: Session with unpushed commits shows amber badge
- **WHEN** a session has `unpushedCount: 3`
- **THEN** the SessionCard shows an amber `↑3 unpushed` badge

#### Scenario: Session with null unpushedCount shows no badge
- **WHEN** a session has `unpushedCount: null`
- **THEN** no commit badge is shown

### Requirement: SummaryPanel shows clean session rate and avg next-action quality
The `SummaryPanel` SHALL reflect two additional quality metrics sourced from `GET /api/analytics`:
- `cleanSessionRate`: shown as "X% clean sessions" in the panel when data is available
- `avgNextActionWords`: surfaced in the panel as "avg X words" to help the user calibrate how specific their next actions are

These two metrics together signal whether AI outputs are being committed (cleanSessionRate) and whether inputs are specific enough for AI to act on (avgNextActionWords).

#### Scenario: Clean session rate appears when data flows
- **WHEN** the analytics API returns `cleanSessionRate: 0.83`
- **THEN** the SummaryPanel shows "83% clean" or similar text

#### Scenario: Low avgNextActionWords produces an advisory in panel
- **WHEN** `avgNextActionWords < 3`
- **THEN** the SummaryPanel shows a subtle amber advisory "Next actions may be too vague"
