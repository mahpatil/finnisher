## Context

The current system captures basic thread and session data but fails to provide visibility into *how* the work is being done. To support professional workflows, we need to surface friction points (retries) and effort allocation. The UI must also evolve from a simple list to a multi-dimensional dashboard that emphasizes velocity and project "momentum."

## Goals / Non-Goals

**Goals:**
- Implement a high-density, "Industrial Pro" visual language using MUI v9.
- Automate the capture of agent metadata (model, tokens, cost) from hook execution.
- Provide real-time visualization of project friction and stalled states.
- Support thread-level blocker management and delegation.

**Non-Goals:**
- Building a full-fledged Gantt chart or project management suite.
- Implementing complex multi-agent coordination (this is for *tracking* execution).

## Decisions

### 1. Visual Language & Architecture
- **Decision**: Use MUI v9 for core components but wrap them in a custom "Glassmorphic" theme that matches the provided Google Stitch designs.
- **Rationale**: MUI provides the necessary accessibility and component stability, while custom CSS/Tailwind can handle the specific "Industrial Pro" aesthetic.
- **Layout**: 12-column Bento grid for the main dashboard to allow flexible information density.

### 2. Metric Capture Pipeline
- **Decision**: Enhance `src/hooks/common.ts` to intercept agent tool outputs.
- **Logic**: Use regex to parse token counts and cost from standard agent summary blocks (e.g., Claude's "Tokens consumed" messages). Store this in the new `sessions` columns.

### 3. Momentum & Friction Calculation
- **Decision**: Calculate "Momentum" as a weighted average of task completion and "Velocity" as sessions-per-unit-time.
- **Decision**: "Friction" is measured by the number of retries per session. A high aggregate friction score for an activity type (e.g., "Edge Case Handling") will trigger a "Critical Advisory" in the sidebar.

### 4. Blocker Management
- **Decision**: Introduce a `blockers` table.
- **Rationale**: Threads often stall due to specific external or technical dependencies. Explicitly tracking these allows the system to differentiate between agent failure and project blockage.

## Risks / Trade-offs

- **Risk**: Parsing agent output for tokens/cost is brittle if agent formats change.
  - **Mitigation**: Use robust regex and provide a manual override/fallback in the UI.
- **Risk**: High-density UI may become overwhelming.
  - **Mitigation**: Use "Tonal Layers" and clear visual hierarchy (Success Green vs Critical Red) to guide focus.
