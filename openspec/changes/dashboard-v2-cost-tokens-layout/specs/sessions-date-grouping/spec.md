## ADDED Requirements

### Requirement: Tab bar is always fully accessible
The dashboard tab bar SHALL be horizontally scrollable with a hidden scrollbar so all 5 tabs (Active, Waiting, Stalled, Done, Sessions) are reachable at any viewport width ≥ 320px. No tab SHALL be clipped or hidden.

The header row (title + Add Thread button) SHALL be a single flex row with `justifyContent: space-between` so both elements appear on one line.

#### Scenario: All tabs reachable at 400px viewport width
- **WHEN** the dashboard is viewed at 400px wide
- **THEN** all 5 tabs are scrollable into view and tappable without a visible scrollbar

#### Scenario: Header is a single row
- **WHEN** the dashboard loads at any width
- **THEN** "Finnisher" title and "Add Thread" button appear on the same row

### Requirement: Sessions list grouped by date bucket
The Sessions tab SHALL render sessions grouped into date buckets: **Today**, **Yesterday**, **This week** (Mon–Sun of current week, excluding today and yesterday), and **Older**. Each bucket with at least one session SHALL have a date label header rendered above its cards.

#### Scenario: Today's sessions appear under Today header
- **WHEN** the Sessions tab renders and there are sessions from today
- **THEN** a "Today" date header appears above those session cards

#### Scenario: Empty buckets are omitted
- **WHEN** there are no sessions from yesterday
- **THEN** no "Yesterday" header is rendered

#### Scenario: Older sessions grouped under Older header
- **WHEN** the Sessions tab renders sessions from 10 days ago
- **THEN** those sessions appear under an "Older" header

### Requirement: Session card shows linked thread title
When a session has a non-null `threadId`, the SessionCard SHALL display a small chip showing the title of the linked thread. The chip SHALL be derived by looking up `threadId` in the threads data already loaded by the dashboard's SWR.

#### Scenario: Session with linked thread shows thread chip
- **WHEN** a SessionCard renders with `threadId` matching a known thread titled "finnisher"
- **THEN** the card shows a chip or label with "finnisher" thread title

#### Scenario: Session without threadId shows no thread chip
- **WHEN** a SessionCard renders with `threadId: null`
- **THEN** no thread chip is shown on the card
