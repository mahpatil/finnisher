## Why

The live dashboard tracks 22 AI sessions across 5 projects but shows `— tokens —` and `$—` for every single one — cost and token data already arrives in the Claude Stop hook's stdin payload but is never saved to the DB. Beyond the data gap, the UI is too sparse to be useful as a daily driver: thread cards show only a title and next action with no sense of momentum, the Sessions tab is invisible at normal viewport widths, and there is no summary of how the user is actually progressing — are they closing threads? Are sessions productive? Is the nextAction quality good enough for the AI to act on? This change fixes the data pipeline, adds a persistent analytics summary, enriches every card with auto-computed signals, and makes the UI meaningfully reflect execution quality.

## What Changes

### Data pipeline fixes
- **Cost/token capture**: Claude Stop hook reads `totalCostUSD`, `tokensIn`, `tokensOut` from stdin and writes them to the session row via a new `updateSession()` function
- **Ghost session detection**: Sessions with `endedAt === null` older than 4 hours are marked `isGhost: true`; SessionCard shows grey "Abandoned" instead of green "● running"

### Layout fixes
- **Responsive tab bar**: All 5 tabs reachable at any width via hidden-scrollbar tab bar; header collapses to one row (title + Add Thread button side-by-side)

### Analytics & richness
- **Momentum summary panel**: Persistent strip above the tabs showing completion rate, weekly velocity (threads closed, sessions, cost), average thread lifetime, token efficiency, streak, and focus status — all auto-computed from existing data
- **Thread age color coding**: Left border on every thread card changes from green → yellow → orange → red as the thread ages, giving instant visual priority signal without adding any text
- **Thread cards enriched**: Session count, last agent, total cost, relative `updatedAt` timestamp, and a subtle nextAction quality indicator (word count proxy for specificity)
- **Contextual dates**: Waiting cards show "waiting X days"; Done cards show formatted `completedAt`
- **Session quality signals**: Each SessionCard shows token efficiency ratio (`1.8× leverage`) and commit completeness status (`✓ clean` or `↑3 unpushed`)
- **Sessions grouped by date**: Today / Yesterday / This week / Older bucketed headers
- **Thread backlink on sessions**: Session cards show the linked thread title chip

## Capabilities

### New Capabilities
- `session-cost-capture`: Stop hook writes cost/token data to session rows — foundational for all cost reporting
- `ghost-session-detection`: API-side detection of abandoned sessions; UI replaces "running" with "Abandoned"
- `thread-session-stats`: API aggregates session count, last agent, total cost per thread; ThreadCard displays them
- `sessions-date-grouping`: Sessions list bucketed by date with headers and thread backlink chip
- `momentum-summary`: Persistent `GET /api/analytics` endpoint + `SummaryPanel` component showing completion rate, weekly velocity, lifetime, efficiency, streak, focus score
- `thread-age-indicators`: Left border color on ThreadCard based on `updatedAt` age (green/yellow/orange/red)
- `session-quality-metrics`: SessionCard shows token efficiency ratio and commit completeness badge derived from existing session fields

### Modified Capabilities
- `session-schema`: `tokensIn`, `tokensOut`, `costUsd` fields exist but are never populated — no schema change, just population

## Analytics datapoints — all auto-captured, zero user input

| Metric | Source fields | What it tells you |
|--------|--------------|-------------------|
| Completion rate | `threads.state` | Are you shipping or accumulating? |
| Weekly threads closed | `threads.completedAt` | Velocity this week |
| Weekly sessions & cost | `sessions.startedAt`, `sessions.costUsd` | Activity volume and spend |
| Average thread lifetime | `completedAt − createdAt` for done threads | Cycle time — shorter = tighter execution |
| Token efficiency ratio | `tokensOut / tokensIn` per session | Are your prompts generating real leverage? |
| Clean session rate | `unpushedCount = 0` at session end | Are AI outputs being committed or abandoned? |
| Current streak | Consecutive days with ≥1 session | Consistency signal |
| Focus status | Current `active` thread count vs 5 | Are you over-loaded right now? |
| Top project this week | `folderName` from sessions | Where is attention actually going? |
| nextAction specificity | Word count of `nextAction` field | Are threads getting precise-enough direction? |
| Thread age | `now − updatedAt` | Visual priority — oldest threads need attention |
| Sessions per completed thread | Sessions `WHERE threadId IN done threads` | Efficiency: fewer sessions per ship = better scoping |
| Cost per completed thread | `SUM(costUsd)` for done thread sessions | ROI on AI spend |

## Impact

- `src/hooks/claude.ts` — reads new fields from Stop hook stdin, calls `updateSession()`
- `src/db/sessions.ts` — adds `updateSession(id, patch)` function
- `src/web/app/api/sessions/route.ts` — adds `isGhost`, `threadId` to SessionData response
- `src/web/app/api/threads/route.ts` — adds `sessionCount`, `lastAgent`, `totalCostUsd` to ThreadWithMeta
- `src/web/app/api/analytics/route.ts` — new route returning all aggregate metrics
- `src/web/components/Dashboard.tsx` — header layout, tab scrollability, sessions grouping, SummaryPanel placement
- `src/web/components/SummaryPanel.tsx` — new component; always visible above tabs
- `src/web/components/ThreadCard.tsx` — age border, stats row, nextAction quality indicator, timestamps
- `src/web/components/SessionCard.tsx` — ghost badge, efficiency chip, commit badge, thread chip
- No schema migrations needed — all target columns already exist
