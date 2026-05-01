# Spec: Web Dashboard (`finn web`)

**Issue**: n/a
**Status**: Draft
**Date**: 2026-05-01

## Problem
The CLI gives fast access to individual thread operations but no overview. Users need a visual dashboard — especially for reviewing sessions across agents, spotting stalled threads, and getting a momentum snapshot at a glance. `finn web` starts it locally; no deployment required.

## Context
Builds on all previous phases. Next.js 15 App Router runs inside the `src/web/` directory. `finn web` CLI command starts it on port 3141. `better-sqlite3` reads from `~/.finnisher/db.sqlite` in API route handlers directly — no separate server. SWR polls every 5 seconds. UI built with shadcn components (Tabs, Card, Badge, Button, Dialog).

## Acceptance Criteria

- [ ] Given `finn web` is run, then Next.js starts and the dashboard is accessible at `http://localhost:3141`
- [ ] Given the dashboard loads, then the Active tab is shown by default with all active threads
- [ ] Given an active thread has `isStalled === true`, then it shows a red stalled warning in its card
- [ ] Given 5 active threads exist, then the Active tab header shows "Active (5/5)" and the Add button is disabled with tooltip "Max 5 active threads"
- [ ] Given fewer than 5 active threads exist, then a visible "Add Thread" button is shown on the Active tab
- [ ] Given a thread card's "Mark Done" button is clicked, then the thread moves out of Active and into Done tab within one 5s poll cycle
- [ ] Given the "Set Waiting" button is clicked on an active thread card, then the thread moves to Waiting tab
- [ ] Given "Edit Next Action" is clicked, then an inline edit field appears; on save the next action is updated
- [ ] Given `finn list` is run in a terminal while the dashboard is open, then the dashboard reflects the change within 5 seconds
- [ ] Given the Sessions tab is opened, then recent sessions are listed with: agent icon, duration, tokens in/out, cost, branch, last commit message, unpushed count
- [ ] Given a session's `unpushedCount > 0`, then it is highlighted in red/amber
- [ ] Given the Stalled tab is opened, then only threads where `isStalled === true` are shown
- [ ] Given the Done tab is opened, then completed threads are shown sorted by `completedAt` DESC, max 30

## Technical Design

### Data Model Changes
None — reads from `src/db/` layer.

### API / Interface Changes

**Next.js API routes** (`src/web/app/api/`):

```
GET  /api/threads              → Thread[] with stalled:boolean injected
POST /api/threads              → create thread, 422 if 5-active limit hit
GET  /api/threads/[id]         → single Thread
PATCH /api/threads/[id]        → update state | nextAction | owner
DELETE /api/threads/[id]       → delete thread

GET  /api/sessions             → Session[] (limit 50, optional ?threadId=)
```

All route handlers import from `src/db/index.ts` directly and call `runMigrations()` at module level.

**`next.config.ts`:**
```typescript
import type { NextConfig } from 'next'
const config: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
}
export default config
```

**`finn web` CLI command:**
```typescript
// src/cli/commands/web.ts
import { spawn } from 'child_process'
// spawn next dev --port 3141 with cwd = src/web
// pipe stdio so user sees Next.js output
```

**Component tree:**
```
app/page.tsx                    # client component, fetches /api/threads
  └── components/Dashboard.tsx  # Tabs root
        ├── TabActive.tsx
        ├── TabWaiting.tsx
        ├── TabStalled.tsx
        ├── TabDone.tsx
        └── TabSessions.tsx

components/ThreadCard.tsx        # used in Active, Waiting, Stalled
components/ThreadForm.tsx        # "Add Thread" dialog
components/SessionCard.tsx       # used in TabSessions
components/NextActionEdit.tsx    # inline edit for next action
```

**SWR usage (`app/page.tsx`):**
```typescript
const { data: threads } = useSWR('/api/threads', fetcher, { refreshInterval: 5000 })
const { data: sessions } = useSWR('/api/sessions', fetcher, { refreshInterval: 5000 })
```

### Key Logic

**Thread card actions:**
- **Mark Done** → `PATCH /api/threads/[id]` `{ state: 'done' }`
- **Set Waiting** → `PATCH /api/threads/[id]` `{ state: 'waiting' }`
- **Edit Next Action** → inline `<input>`, on blur/Enter → `PATCH /api/threads/[id]` `{ nextAction: value }`

**Active tab sort:** `updatedAt` ASC — most neglected thread appears at top, creating visual pressure to address it.

**Stalled tab:** client-side filter on `thread.stalled === true` from the pre-computed API response.

**Agent badge icons (text-based for MVP):**
```
claude_code → "Claude"   (purple badge)
codex       → "Codex"    (green badge)
opencode    → "OpenCode" (blue badge)
manual      → "Manual"   (gray badge)
```

**Duration display:** if `endedAt` is null → "running" with a pulsing dot; otherwise `durationStr(endedAt - startedAt)`.

**Add Thread dialog** (`ThreadForm.tsx`):
- Fields: Title, Next Action, Owner (select), State (select; active disabled if at 5 limit)
- On submit → `POST /api/threads`; on 422 → show inline error

## Test Scenarios

### Happy Path
1. `finn web` → browser opens, Active tab shows threads matching `finn list` output
2. Click "Mark Done" on a thread → thread disappears from Active, appears in Done tab on next poll
3. Add thread via dashboard form → appears in Active tab
4. `finn next <id> "new action"` in terminal → dashboard shows updated next action within 5s
5. Sessions tab → shows all sessions from recent Claude Code usage with token counts

### Edge Cases
1. Active tab with 0 threads → shows empty state: "No active threads. Add one to get started."
2. Stalled tab with 0 stalled threads → shows empty state: "No stalled threads. Good momentum!"
3. Session with `endedAt: null` → duration shows "running" with indicator
4. Session with `costUsd: null` → cost cell shows "—"
5. `unpushedCount: 0` → no highlight; `unpushedCount: 3` → amber number

### Error Cases
1. `PATCH /api/threads/[id]` for non-existent id → 404 response, dashboard shows toast error
2. `POST /api/threads` when 5 active threads exist → 422, dialog shows "Max 5 active threads reached"
3. `finn web` when port 3141 is already in use → Next.js error surfaced in terminal

## Out of Scope
- Authentication / multi-user
- Cloud sync or remote access
- Dark mode toggle (Tailwind dark: classes fine if added, not required)
- Thread drag-and-drop reordering
- Real-time websocket updates (SWR polling at 5s is sufficient)
- Mobile-responsive layout (desktop-first for MVP)
- Editing thread title or notes from the dashboard

## Open Questions
None.

## Implementation Notes
- `src/web/` is a self-contained Next.js app; `finn web` spawns it as a child process
- `package.json` scripts: `"web:dev": "next dev --port 3141"` in root for direct dev use
- shadcn components to install: `npx shadcn@latest add tabs card badge button dialog input`
- `components.json` should set `baseColor: "zinc"` and `style: "default"` for shadcn
- API routes must call `runMigrations()` at module level (not inside the handler) — module-level runs once per process lifecycle
- `better-sqlite3` binaries are platform-specific — `npm install` must be run on the target machine; no pre-bundling
- `src/web/app/layout.tsx` should set `<html lang="en">` and import global Tailwind CSS
- Keep API responses lean: don't serialize internal Drizzle metadata, only plain fields + computed `stalled`
