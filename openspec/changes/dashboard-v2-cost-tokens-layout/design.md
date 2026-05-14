## Context

Finnisher records Claude Code sessions via a Stop hook that receives `{ totalCostUSD, tokensIn, tokensOut, sessionId }` on stdin. The `sessionId` maps to a row in the sessions SQLite table which already has `costUsd`, `tokensIn`, `tokensOut` columns — they just never get written. The threads and sessions tables together contain enough data to compute completion rate, weekly velocity, token efficiency, streak, and thread age signals — all without any schema changes. The web dashboard currently has no summary layer, sparse thread cards, and a 5-tab layout that overflows at normal viewport widths.

## Goals / Non-Goals

**Goals:**
- Surface cost/token data already arriving in the hook payload
- Add a persistent analytics summary panel above the tabs (no new tab needed)
- Enrich thread cards with age signals and session stats
- Enrich session cards with quality signals (efficiency, commit completeness)
- Fix tab overflow and header layout
- Mark abandoned ghost sessions

**Non-Goals:**
- Real-time token counter during a live session
- Changing the SQLite schema (all target columns already exist)
- State-change history log (can't compute bounce rate without it)
- Charts or visualisations beyond text/badge-based indicators
- Multi-user or authentication

## Decisions

### D1: Update session in Stop hook (not via a new endpoint)
The Stop hook already runs with the correct `sessionId` in context. The simplest path is `updateSession(sessionId, { costUsd, tokensIn, tokensOut, endedAt })` called directly from the hook handler — same pattern as the existing `touchSession` call.

**Alternative considered**: A `POST /api/sessions/:id/cost` webhook. Rejected — adds HTTP round-trip, requires the hook to know the web server URL, and the hook already has direct DB access.

### D2: Ghost detection at read time (not a daemon)
`isGhost` is computed in `GET /api/sessions` as `endedAt === null && (now - startedAt) > 4 * 3600_000`. No cron job or background process needed — consistent with the existing stalled-thread pattern.

### D3: Thread session aggregates in the threads API route
`GET /api/threads` extends its mapper to run SQLite aggregates (`COUNT`, `MAX`, `SUM`) grouped by `threadId` in a single batch query. With ≤50 threads this is negligible (<1ms).

### D4: Separate `GET /api/analytics` endpoint (not added to threads or sessions)
Analytics metrics span both tables and have different cache lifetimes (30s vs 5s for threads). A dedicated route keeps the contracts clean and lets the SummaryPanel poll at a slower rate.

**Analytics response shape:**
```typescript
interface AnalyticsData {
  // Completion
  completionRate: number              // done / total (0-1)
  threadsClosedThisWeek: number
  avgLifetimeDays: number | null      // null if no done threads
  avgSessionsPerCompletedThread: number | null

  // Sessions this week
  sessionsThisWeek: number
  costThisWeek: number | null         // null until cost data flows
  totalCostAllTime: number | null

  // Quality
  avgTokenEfficiency: number | null   // avg(tokensOut/tokensIn) for sessions with both; >1 = leverage
  cleanSessionRate: number | null     // % sessions where unpushedCount=0
  avgNextActionWords: number          // avg word count of nextAction on non-done threads

  // Focus & activity
  currentStreak: number               // consecutive days with ≥1 session
  activeThreadCount: number
  topProjectThisWeek: { folderName: string; sessionCount: number } | null
}
```

### D5: Scrollable tabs with hidden scrollbar (CSS-only)
MUI `<Tabs>` `sx` prop: `'& .MuiTabs-scroller': { overflow: 'auto !important', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }`. All 5 tabs reachable by horizontal scroll without visible scrollbar.

### D6: Thread age border — CSS left border only
ThreadCard gets a 4px left border colored by `now - updatedAt`: green (<24h), yellow (1–3d), orange (3–7d), red (>7d or stalled). This is the highest-signal visual change per pixel — no additional text, no layout change.

### D7: nextAction quality indicator — word count proxy
A `nextAction` with ≤2 words (e.g., "do stuff") is too vague for an AI agent to act on; ≥5 words is generally specific. Show a subtle amber dot on thread cards where `wordCount(nextAction) <= 2` with a tooltip "Next action may be too vague". No hard blocking.

### D8: Token efficiency ratio
`efficiency = tokensOut / tokensIn`. Values:
- `< 0.5`: model generating much less than you prompted — potential over-prompting or very short responses
- `0.5–1.5`: balanced
- `> 1.5`: good leverage — model generating substantial output per prompt unit

Show as "1.8× leverage" chip on SessionCard when both fields are available.

### D9: Date grouping in component (not API)
Grouping sessions into Today/Yesterday/This week/Older is a pure display concern computed from `startedAt` in the component.

## Risks / Trade-offs

- **Partial historical cost data**: Sessions before the hook fix have `null` cost. Summary panel shows `$—` for cost metrics until enough sessions accumulate. Self-heals.
- **4h ghost threshold**: A legitimate overnight session would be marked abandoned. Display-only — no data mutation.
- **Token efficiency without cost fix**: Until D1 (Stop hook fix) ships, `tokensIn/tokensOut` are null, so efficiency ratio shows `—`. Both ship together.
- **nextAction quality is a proxy, not truth**: Word count doesn't capture actual specificity. Intent is to nudge, not enforce.

## Migration Plan

1. Deploy `updateSession` + Stop hook fix → new sessions get cost data
2. Deploy analytics API → `SummaryPanel` renders with real data (with graceful `—` for null fields)
3. Deploy UI enrichments → thread/session cards get richer
4. No DB migration needed

## Open Questions

- Should ghost sessions be auto-closed (write `endedAt = startedAt + 4h`) or display-only? Current answer: display-only.
- Should the SummaryPanel be collapsible? Current answer: no — it's compact enough (single row) that it's always visible.
