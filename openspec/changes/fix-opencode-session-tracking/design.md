## Context

Finnisher currently registers OpenCode hooks via `~/.opencode/config.json` with an `after` hook that fires `finn hook opencode-stop` after every LLM response. This is the wrong lifecycle event — `after` fires per-turn, not per-session. Additionally, there is no start handler, so sessions are never created. The stop handler always fails to find an open session.

OpenCode's native plugin system provides `session.created` and `session.deleted` events that map perfectly to session start/end. Plugins can be placed in `~/.config/opencode/plugins/` (global) or `.opencode/plugins/` (project-level). Plugins are TypeScript modules that export a hooks object.

The OpenCode plugin system uses an `event` hook pattern:
```typescript
export const FinnisherPlugin: Plugin = async (ctx) => ({
  event: async ({ event }) => {
    if (event.type === "session.created") { ... }
    if (event.type === "session.deleted") { ... }
  },
})
```

However, the plugin runs inside OpenCode's Node.js process — it can't directly call `finn hook` via subprocess without potential issues. A simpler approach: the plugin reads `.finn-thread` and calls the Finnisher DB directly, OR the plugin spawns a child process calling `finn hook opencode-start --cwd <dir>` and `finn hook opencode-stop --cwd <dir>`.

The child process approach is preferred because:
- Keeps Finnisher as the single source of truth for session management
- No need to duplicate DB logic in the plugin
- Already battle-tested pattern (same as Claude Code hooks)
- Plugin just acts as an event relay

The plugin needs the project directory. OpenCode sets `process.cwd()` to the project directory when started. The plugin can read `process.cwd()` directly, or the `session.created` event may include project path info.

## Goals / Non-Goals

**Goals:**
- Create sessions on OpenCode `session.created` with `.finn-thread` linking
- Close sessions on `session.deleted` with git state
- Replace broken `after` hook with proper plugin
- Idempotent setup — re-running doesn't duplicate plugins

**Non-Goals:**
- No token/cost capture for now (OpenCode doesn't expose these in session events — same limitation as current implementation)
- No `session.idle` support (deleted is the definitive end event)
- No changes to database schema

## Decisions

### Decision: Use child process approach in plugin
Rationale: The plugin spawns `finn hook opencode-start --cwd <dir>` and `finn hook opencode-stop --cwd <dir>` as child processes. This keeps Finnisher's DB layer as the single authority and avoids importing `better-sqlite3` inside OpenCode's process (which could conflict with OpenCode's own DB usage).

### Decision: Plugin file at `~/.config/opencode/plugins/finnisher.ts`
Rationale: Global plugin covers all projects. Project-level `.finn-thread` files still control thread linking per-repo. This matches how Claude Code's global hooks work with per-project `.finn-thread` files.

### Decision: Plugin uses `spawn` with `detached: true` for reliability
Rationale: OpenCode may kill child processes on shutdown. Using `detached: true` and `unref()` ensures the `finn` command completes even if OpenCode exits quickly. The `opencode-stop` handler must be fire-and-forget.

### Decision: Remove `after` hook from config.json during setup
Rationale: The existing `after` hook in `~/.opencode/config.json` must be cleaned up. Setup will read the existing config, remove the `after` key if it matches the Finnisher command, and write back. This prevents double-firing during the transition.

## Risks / Trade-offs

- **[OpenCode plugin system may change]** → Plugin API is relatively new. Mitigation: Plugin is a simple `event` hook that only checks `event.type`. Minimal surface area for breakage.
- **[Child process may not complete on shutdown]** → `session.deleted` fires during OpenCode shutdown. Mitigation: `spawn` with `detached: true` + `unref()` + `finn` is fast (sync DB write). The hook always exits 0.
- **[Plugin file requires TypeScript compilation]** → OpenCode can load `.ts` files directly (uses Bun/Node with ts-node-like behavior). If not, fallback to `.js`. Mitigation: Ship a `.js` file that uses `child_process.spawn` — no compilation needed.
- **[Existing `after` hook conflicts]** → Both `after` hook and plugin could fire on session end during transition. Mitigation: Setup removes `after` hook atomically before installing plugin.
