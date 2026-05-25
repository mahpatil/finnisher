# Spec: Responsive UI, Thread Todos, Priority Card Highlights

**Issue**: n/a
**Status**: Draft
**Date**: 2026-05-25

## Problem

The dashboard is desktop-only: the permanent 260px sidebar makes it unusable on a phone, and on desktop there's no way to collapse the sidebar to reclaim screen space. Thread cards look identical regardless of priority, so NOW and NEXT items don't stand out at a glance. There's no lightweight checklist mechanism inside a thread — users can only set a single `nextAction`, not track sub-items.

## Context

The dashboard is a Next.js 15 App Router app using MUI v6 with a dark theme. `LayoutShell` renders a `Drawer variant="permanent"` at 260px that blocks mobile use. `ThreadCard` applies priority colour only to a small chip badge; the card itself has no priority-based visual accent. The `threads` table has no child todo concept — `nextAction` is a single text field.

---

## Acceptance Criteria

### Responsive layout

- [ ] Given the viewport width is < 600px, the sidebar drawer is hidden by default and a hamburger `MenuIcon` button is visible in the AppBar left side
- [ ] Given the viewport width is ≥ 900px, the permanent sidebar drawer is visible and no hamburger button appears
- [ ] Given the user taps the hamburger icon on mobile, the drawer opens as a full-height overlay; tapping any nav item closes the drawer and navigates to the selected route
- [ ] Given the viewport width is < 600px, the AppBar title ("Finnisher") and search bar are still legible (search input can be hidden; title stays visible)
- [ ] Given the user is on desktop (viewport ≥ 900px), a collapse toggle button (chevron icon) is visible at the bottom of the sidebar; clicking it collapses the sidebar to show only icons (no labels, drawer width ~56px)
- [ ] Given the sidebar is collapsed, clicking the chevron again expands it back to full width (260px) with labels restored
- [ ] Given the sidebar is collapsed, nav icons are still clickable and navigate to the correct route

### Priority card highlights

- [ ] Given a thread card has priority `now`, the Card component has a 4px solid red (`#f44336`) left border
- [ ] Given a thread card has priority `next`, the Card component has a 4px solid orange (`#ff9800`) left border
- [ ] Given a thread card has priority `later` or `out`, no priority-driven left border accent is applied (stalled state border is unchanged)

### Thread todos

- [ ] Given a thread detail view is open, a "Todos" section is displayed below the session timeline with a text input and "Add" button
- [ ] Given a todo text is typed and Add is clicked (or Enter pressed), the new todo appears as an unchecked item in the list without a page reload
- [ ] Given a todo checkbox is clicked, the item is marked done (text gets a strikethrough) and the state persists across page reload
- [ ] Given a done todo's checkbox is clicked again, the todo is un-checked and no longer shows strikethrough
- [ ] Given a thread has todos, the thread card shows a small `done/total` chip (e.g. `2/5 ✓`) below the title when total > 0; when all are done it shows `5/5 ✓` in green
- [ ] Given `POST /api/threads/:id/todos` receives `{ text: string }`, it returns `201` with `{ todo: { id, threadId, text, done, createdAt } }`
- [ ] Given `GET /api/threads/:id/todos` is called, it returns `200` with `{ todos: Todo[] }` ordered by `createdAt` ascending
- [ ] Given `PATCH /api/todos/:id` receives `{ done: boolean }`, it returns `200` with the updated todo
- [ ] Given a todo item is hovered/focused, an edit icon (pencil) and a delete icon (trash) are visible inline
- [ ] Given the edit icon is clicked, the todo text becomes an editable input pre-filled with the current text; pressing Enter or clicking a save button commits the change; pressing Escape cancels
- [ ] Given the updated text is committed, `PATCH /api/todos/:id` is called with `{ text: string }` and the list reflects the new text without a page reload
- [ ] Given the delete icon is clicked, the todo is removed from the list immediately and `DELETE /api/todos/:id` is called; the count chip on the thread card updates accordingly

---

## Technical Design

### Data Model Changes

New table `thread_todos`:

```sql
CREATE TABLE thread_todos (
  id           TEXT PRIMARY KEY,
  thread_id    TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  done         INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  completed_at INTEGER
);
```

Drizzle schema addition in `src/db/schema.ts`:

```ts
export const threadTodos = sqliteTable('thread_todos', {
  id:          text('id').primaryKey(),
  threadId:    text('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
  text:        text('text').notNull(),
  done:        integer('done', { mode: 'boolean' }).notNull().default(false),
  position:    integer('position').notNull().default(0),
  createdAt:   integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
})

export type ThreadTodo    = typeof threadTodos.$inferSelect
export type NewThreadTodo = typeof threadTodos.$inferInsert
```

New migration file: `src/db/migrations/0004_thread_todos.sql`

The threads API (`/api/threads`) must include todo counts in each thread's response — add `todoDone: number` and `todoTotal: number` computed from a subquery (or a separate count query per thread). These feed the card badge.

### API / Interface Changes

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/threads/:id/todos` | List todos for a thread (ordered by `createdAt` ASC) |
| POST | `/api/threads/:id/todos` | Create a new todo for a thread |
| PATCH | `/api/todos/:id` | Update a todo — toggle `done` or edit `text` |
| DELETE | `/api/todos/:id` | Delete a todo |

**Route file locations** (following existing project pattern):
- `src/web/app/api/threads/[id]/todos/route.ts` — GET + POST
- `src/web/app/api/todos/[id]/route.ts` — PATCH + DELETE

**Request/response shapes**

POST `/api/threads/:id/todos` body: `{ text: string }` → 201 `{ todo: TodoItem }`
PATCH `/api/todos/:id` body: `{ done?: boolean; text?: string }` (at least one field required) → 200 `{ todo: TodoItem }`
DELETE `/api/todos/:id` → 204 no body
GET `/api/threads/:id/todos` → 200 `{ todos: TodoItem[] }`

Error shape follows existing pattern: `{ error: { code, message } }`

Validation: `text` (on create/update) must be a non-empty string after trimming; `done` must be boolean; PATCH must include at least one of `done` or `text`.

### Key Logic

**LayoutShell responsive drawer**: Use MUI `useMediaQuery(theme.breakpoints.down('md'))` to detect mobile/tablet. On mobile (< 900px): `Drawer variant="temporary"`, controlled by `mobileOpen` state; hamburger `IconButton` in AppBar. On desktop (≥ 900px): `Drawer variant="permanent"`. Add a `sidebarOpen` boolean state (default `true`) for the desktop collapse. When `sidebarOpen` is false, `drawerWidth` drops to 56px; nav items show only icons (hide `ListItemText` with `display: 'none'`); a chevron-right icon replaces the chevron-left at the bottom of the drawer. Content area `marginLeft` adjusts accordingly.

**Priority card border**: In `ThreadCard`, add a conditional `borderLeft` to the `Card`'s `sx` prop:
```ts
...(thread.priority === 'now'  && { borderLeft: '4px solid #f44336' }),
...(thread.priority === 'next' && { borderLeft: '4px solid #ff9800' }),
```
This must not conflict with the existing stalled state border (stalled uses `border: '1px solid'` on all sides — that overrides borderLeft; apply priority border only when not stalled, or use a box-shadow/outline instead for stalled threads that also have priority set).

**Todo count in thread card**: Add `todoDone: number` and `todoTotal: number` to `ThreadData` interface. The `/api/threads` GET route computes these via a subquery for each thread. Card renders a chip only when `todoTotal > 0`.

**Todo persistence in ThreadDetail**: `ThreadDetail` fetches `/api/threads/:id/todos` with SWR on mount; optimistically updates the list on add/toggle/edit/delete, mutates on response. Inline edit mode is local component state (`editingId: string | null`); clicking the pencil icon sets `editingId = todo.id`, renders an `InputBase` pre-filled with `todo.text`.

**Position**: Set `position` to `Date.now()` on creation for stable ordering without gaps.

---

## Test Scenarios

### Happy Path

1. On a 375px wide viewport, the layout renders without a horizontal scrollbar; hamburger icon is visible in AppBar; sidebar is not visible
2. Tapping hamburger opens the MUI Drawer overlay; tapping "Threads" in the nav closes it and navigates to `/threads`
3. On a 1280px desktop viewport, the sidebar is permanently visible; no hamburger icon present
4. On desktop, clicking the collapse chevron hides sidebar labels and shrinks the drawer to icon-only width; main content expands to fill the space; clicking again restores full sidebar
5. Thread card with `priority: 'now'` renders with a visible red left border; thread card with `priority: 'later'` has no coloured left border
6. Opening a thread detail view shows a "Todos" section; typing "Write tests" and pressing Enter adds the item unchecked
7. Clicking a todo checkbox marks it done; reloading the page keeps it checked
8. Clicking the edit icon on a todo shows an editable input; editing and pressing Enter updates the text
9. Clicking the delete icon on a todo removes it from the list; the count chip on the card updates
10. A thread with 2 done out of 3 todos shows `2/3 ✓` chip on its card

### Edge Cases

1. A thread with zero todos shows no todo chip on the card
2. Adding an empty todo (whitespace only) is rejected — the Add button stays disabled or the input is trimmed and rejected with a validation message
3. A thread card that is both stalled and priority `now` — left border behaviour is well-defined (priority border applies; stalled overrides with full border, so final state: full stalled border takes precedence)
4. A very long todo text (100+ chars) wraps gracefully without breaking the layout

### Error Cases

1. `POST /api/threads/:id/todos` with empty `text` returns 422 `{ error: { code: 'INVALID_INPUT', message: 'text is required' } }`
2. `PATCH /api/todos/:id` with `{ text: '' }` (empty string) returns 422
3. `PATCH /api/todos/:id` or `DELETE /api/todos/:id` on a non-existent id returns 404
4. Todo fetch fails — the Todos section shows "Could not load todos" instead of crashing

---

## Out of Scope

- Reordering todos via drag-and-drop (Phase 2)
- Showing todos on the `/threads` list page cards (only on dashboard and detail view)
- Todo reminders or due dates
- Search in the AppBar on mobile (input can be hidden on xs breakpoint)
- Full tablet/iPad landscape optimisation (we target phone portrait as the primary mobile breakpoint)

---

## Non-Functional Requirements

### Integration Contracts

None — all data is local SQLite via Drizzle ORM, no external services.

### Analytics

None — local-only tool.

### Metrics

None — local-only tool.

### Observability

None — local-only tool. Errors follow the existing `hook.log` and Snackbar pattern.

---

## Open Questions

None — all decisions above are scoped and unambiguous.

---

## Implementation Notes

- `LayoutShell` needs `'use client'` (already has it). Import `useMediaQuery` and `useTheme` from MUI; use `theme.breakpoints.down('md')` for the toggle threshold.
- Add `mobileOpen` state (`useState(false)`) and a `handleDrawerToggle` function.
- On mobile, add `MenuIcon` to the AppBar `Toolbar` left side: `<IconButton edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' } }}>`.
- Drawer `sx` needs `display: { xs: 'block', md: 'none' }` for temporary and `display: { xs: 'none', md: 'block' }` for permanent.
- `ThreadData` interface (in `ThreadCard.tsx`) gets two new optional fields: `todoDone?: number` and `todoTotal?: number`.
- The threads API route (`src/web/app/api/threads/route.ts`) joins `thread_todos` with `COUNT(*) FILTER (WHERE done=1)` — or runs a separate query for all todo counts and merges. Given SQLite, a separate `listTodoCounts(threadIds)` in `src/db/todos.ts` is simpler.
- New file: `src/db/todos.ts` with `createTodo`, `listTodos`, `updateTodo`, `deleteTodo`.
- `ThreadDetail` gets a new `TodoSection` component (or inline) using SWR to `/api/threads/:id/todos`.
- Playwright tests use `page.setViewportSize({ width: 375, height: 812 })` to simulate iPhone 12.
- When both stalled-border and priority-border would apply: use `borderLeft` for priority and preserve `border` for stalled — MUI `sx` spread order determines precedence. Spread stalled styles last so they override: `...stalledSx, ...priorityBorderSx` — or accept that stalled already applies `border` (all sides), which includes borderLeft, so stalled wins. Document this as intentional.
