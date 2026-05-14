## 1. DB Layer — updateSession

- [ ] 1.1 Add `updateSession(id: string, patch: { costUsd?, tokensIn?, tokensOut?, endedAt? })` to `src/db/sessions.ts` using Drizzle partial update; only touch provided fields plus `updatedAt`
- [ ] 1.2 Write unit tests: partial patch updates only given fields, no-op for unknown id, `updatedAt` always refreshed

## 2. Stop Hook — cost/token capture

- [ ] 2.1 Read `totalCostUSD`, `tokensIn`, `tokensOut` from stdin JSON in `src/hooks/claude.ts` Stop handler alongside existing `sessionId` read
- [ ] 2.2 Call `updateSession(sessionId, { costUsd: totalCostUSD, tokensIn, tokensOut, endedAt: new Date() })` — log warning to hook.log if sessionId not found, always exit 0
- [ ] 2.3 Write unit tests: full payload saves all fields, missing fields leave columns null, unknown sessionId logs + exits 0

## 3. Sessions API — ghost detection + threadId

- [ ] 3.1 Add `isGhost: boolean` to `SessionData` in `src/web/app/api/sessions/route.ts` — `endedAt === null && now - startedAt > 4 * 3_600_000`
- [ ] 3.2 Add `threadId: string | null` to `SessionData` response (already in DB row, just not serialised)
- [ ] 3.3 Write unit tests: old unclosed → ghost, recent unclosed → not ghost, closed → not ghost

## 4. Threads API — session aggregates

- [ ] 4.1 Add `sessionCount`, `lastAgent`, `totalCostUsd` to `ThreadWithMeta` type
- [ ] 4.2 Run a single `GROUP BY thread_id` aggregate query in `GET /api/threads` returning `COUNT`, `MAX(startedAt)` agent, `SUM(costUsd)` per thread; merge results into each `ThreadWithMeta`
- [ ] 4.3 Write unit tests: thread with sessions returns correct aggregates, thread with no sessions returns 0/null, sessions with null cost return null totalCostUsd

## 5. Analytics API — new endpoint

- [ ] 5.1 Create `src/web/app/api/analytics/route.ts` — `GET` handler calling `runMigrations()` then batch SQLite aggregates
- [ ] 5.2 Implement all `AnalyticsData` fields: `completionRate`, `threadsClosedThisWeek`, `avgLifetimeDays`, `avgSessionsPerCompletedThread`, `sessionsThisWeek`, `costThisWeek`, `totalCostAllTime`, `avgTokenEfficiency`, `cleanSessionRate`, `avgNextActionWords`, `currentStreak`, `activeThreadCount`, `topProjectThisWeek`
- [ ] 5.3 `currentStreak` logic: query distinct calendar days with sessions, walk backwards from today counting consecutive days
- [ ] 5.4 `avgTokenEfficiency`: `AVG(CAST(tokens_out AS REAL) / tokens_in)` WHERE both are non-null
- [ ] 5.5 `cleanSessionRate`: `COUNT(*) WHERE unpushed_count = 0` / `COUNT(*) WHERE unpushed_count IS NOT NULL`
- [ ] 5.6 Write unit tests for each metric: correct value with data, null/0 defaults with empty DB

## 6. SummaryPanel component

- [ ] 6.1 Create `src/web/components/SummaryPanel.tsx` — SWR fetch from `/api/analytics` at 30s interval
- [ ] 6.2 Layout: single compact row with 6 slots: Done %, This week (↓/⚡/$), Avg lifetime, Efficiency, Streak, Focus bar
- [ ] 6.3 Focus bar: mini progress bar showing `activeThreadCount / 5`; green ≤5, red ≥9
- [ ] 6.4 Null handling: all null-able slots render `—` gracefully without layout shift
- [ ] 6.5 Advisory: render amber inline text "Next actions may be too vague" when `avgNextActionWords < 3`
- [ ] 6.6 Show `cleanSessionRate` as "X% clean" when non-null
- [ ] 6.7 Mount `<SummaryPanel />` in `Dashboard.tsx` between header row and `<Tabs>` — no layout disruption to existing tabs

## 7. Dashboard layout — header + scrollable tabs

- [ ] 7.1 Merge title + Add Thread button into single flex row in `Dashboard.tsx` (`justifyContent: space-between`, `alignItems: center`)
- [ ] 7.2 Make tab bar scrollable: `sx={{ '& .MuiTabs-scroller': { overflow: 'auto !important', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } } }}`
- [ ] 7.3 Verify all 5 tabs reachable at 400px viewport (e2e test)

## 8. SessionCard — ghost + quality signals + thread chip

- [ ] 8.1 Accept `isGhost: boolean` and `threadTitle?: string` props in `SessionCard.tsx`
- [ ] 8.2 Render grey "Abandoned" chip in place of green "● running" when `isGhost === true`
- [ ] 8.3 Token efficiency chip: show `{ratio}× leverage` chip (green ≥1.5, grey 0.5-1.5, amber <0.5) when both token fields non-null
- [ ] 8.4 Commit completeness badge: green `✓ clean` when `unpushedCount === 0`; amber `↑N unpushed` when `unpushedCount > 0`; omit when null
- [ ] 8.5 Thread title chip: render small `↗ threadTitle` chip when `threadTitle` is provided
- [ ] 8.6 Wire up from Dashboard: build a `threadTitleById` lookup map from threads SWR data; pass `isGhost` and `threadTitle` to each `SessionCard`

## 9. ThreadCard — age border + stats row + timestamps + quality indicator

- [ ] 9.1 Create `src/web/utils/threadAge.ts` with `threadBorderColor(updatedAt: string, stalled: boolean, completedAt?: string | null): string` — returns hex colour
- [ ] 9.2 Apply left border to `<Card>` in `ThreadCard.tsx` using `threadBorderColor()` result (`sx={{ borderLeft: '4px solid ${color}' }}`)
- [ ] 9.3 Add `timeAgo(date: string): string` to `src/web/utils/timeAgo.ts` — handles seconds, minutes, hours, days
- [ ] 9.4 Stats row: show "N sessions · last: Claude · $0.48" below owner badge only when `sessionCount > 0`
- [ ] 9.5 Show relative `updatedAt` using `timeAgo()` on all thread cards
- [ ] 9.6 Show "waiting X days" on Waiting tab cards; "Done [Month D]" on Done tab cards
- [ ] 9.7 nextAction quality indicator: amber dot + tooltip "Next action may be too vague" when word count ≤ 2 and thread is not done
- [ ] 9.8 Write unit tests for `threadBorderColor` and `timeAgo` covering all brackets

## 10. Sessions date grouping

- [ ] 10.1 Add `groupSessionsByDate(sessions: SessionData[]): { label: string; sessions: SessionData[] }[]` in `src/web/utils/groupSessions.ts` — buckets: Today, Yesterday, This week, Older
- [ ] 10.2 Render grouped sessions in Dashboard Sessions tab with `Typography variant="overline"` date headers; skip empty buckets
- [ ] 10.3 Write unit tests: correct bucketing for each date range; empty buckets omitted

## 11. Tests + verification

- [ ] 11.1 E2e: SummaryPanel is visible and contains expected text slots
- [ ] 11.2 E2e: thread card shows green border for recently updated thread
- [ ] 11.3 E2e: SessionCard shows "Abandoned" for ghost session
- [ ] 11.4 E2e: Sessions tab shows date group headers
- [ ] 11.5 E2e: all 5 tabs reachable at 400px viewport
- [ ] 11.6 Run `npm test` — all unit tests green
- [ ] 11.7 Run `npm run test:e2e` — all e2e tests green
- [ ] 11.8 Browser verification: trigger a new Claude session, confirm tokens/cost appear in sessions list and SummaryPanel within 30s
