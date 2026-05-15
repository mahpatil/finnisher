## 1. Database & Schema Evolution (Roadmap Phase 1)

- [x] 1.1 Create migration to add `agent_id`, `tokens_in`, `tokens_out`, `cost`, `effort_type`, and `friction_score` to `sessions`
- [x] 1.2 Create migration to add `momentum`, `stalled_at`, and `last_velocity` to `threads`
- [x] 1.3 Create `blockers` table with `id`, `thread_id`, `description`, `level`, and `status`
- [x] 1.4 Update Drizzle schemas and types in `src/db/schema.ts`

## 2. Hook Metadata Capture (Roadmap Phase 2)

- [x] 2.1 Update `src/hooks/common.ts` with regex parsers for agent token/cost summaries
- [x] 2.2 Enhance `createSession` logic to accept and persist the new metadata
- [x] 2.3 Implement auto-detection of `effort_type` based on hook command context

## 3. Core UI: Theme & Shell (Roadmap Phase 3)

- [x] 3.1 Implement "Momentum Engine" MUI v9 theme with custom colors and glassmorphism
- [x] 3.2 Create the new `LayoutShell` with the left `SideNavBar` and top `Header`
- [x] 3.3 Add the "AI Advisory" critical notification widget to the sidebar
- [x] 3.4 Implement global search for threads and sessions in the header

## 4. Momentum Dashboard (Roadmap Phase 4)

- [x] 4.1 Implement the 12-column Bento Grid layout for the home page
- [x] 4.2 Create the `VelocityHistory` bar chart component
- [x] 4.3 Build the `StalledThreads` alert panel
- [x] 4.4 Update `ThreadCard` with the \"Momentum Meter\" and status indicators

## 5. Thread Detail & Session Log (Roadmap Phase 5)

- [x] 5.1 Implement the `ThreadDetail` view with progress bars and cost summaries
- [x] 5.2 Build the `VerticalTimeline` for thread sessions with status icons
- [x] 5.3 Implement the `BlockerPanel` with CRUD actions and \"Delegate\" button
- [x] 5.4 Create the high-density `SessionLog` table with advanced filtering (Agent, Date, Status)

## 6. Advanced Analytics (Roadmap Phase 6)

- [x] 6.1 Implement the `FrictionHeatmap` component visualizing struggle points
- [x] 6.2 Build the `EffortDistribution` horizontal bar chart
- [x] 6.3 Add the \"High Velocity Opportunities\" panel to suggest project closures
