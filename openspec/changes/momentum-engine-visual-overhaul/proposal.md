## Why

The current finnisher UI is functional but lacks the "Industrial Pro" technical precision and information density required for sophisticated agent orchestration. This overhaul transitions the system into a "Momentum Engine," capturing deep execution metrics like friction points and effort distribution to provide actionable insights that drive project completion.

## What Changes

- **Industrial Pro UI**: A complete visual redesign using Material UI v9, following a deep-dark glassmorphic aesthetic with high-contrast accenting for metrics.
- **Deep Session Analytics**: Capturing agent names, token consumption, cost-per-outcome, and effort categories (Debugging, New Features, Refactoring, Documentation).
- **Friction Identification**: Tracking validation loops and retry rates to identify "Struggle Points" in execution.
- **Momentum Dashboard**: A new high-level view featuring velocity charts, stalled project alerts, and "High Velocity Opportunities."
- **Thread Timeline & Blockers**: An evolved thread detail view with a vertical session timeline and a dedicated "System Blockers" management panel.
- **Execution Stream**: A real-time, terminal-style table view of all global operations.

## Capabilities

### New Capabilities
- `friction-tracking`: Identification and visualization of execution bottlenecks and failure loops.
- `effort-distribution`: Automatic and manual categorization of session activities to track time allocation.
- `blocker-management`: Tracking and resolving specific technical blockers at the thread level.
- `momentum-analytics`: Visualizing velocity history and project completion probabilities.

### Modified Capabilities
- `session-schema`: **BREAKING** - Extend schema to include `agent_id`, `tokens_in`, `tokens_out`, `cost`, `effort_type`, and `friction_score`.
- `auto-detect-threads`: Enhance hooks to capture new metadata (tokens, agent info) from tool outputs.

## Impact

- **Database**: Migration required for `sessions` and `threads` tables.
- **Hooks**: Significant updates to agent hooks (Claude, Codex) to parse and report token/cost data.
- **Web UI**: Complete replacement of current components with a new layout shell and bento-grid components.
- **CLI**: Enhanced `finn sessions` and `finn status` to report on momentum and friction.
