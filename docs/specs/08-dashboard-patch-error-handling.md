# Spec: Dashboard PATCH Error Handling

**Issue**: n/a
**Status**: Draft
**Date**: 2026-05-25

## Problem

When a PATCH request to `/api/threads/[id]` fails (network error, 404, 422), the dashboard silently swallows it. The `patchThread` helper in both `Dashboard.tsx` and `src/web/app/threads/page.tsx` calls `fetch` but never checks the response status. The user clicks "FINISH", "PARK", "ARCHIVE", or changes a priority — nothing happens visually if the server rejects the request, and the UI quietly reverts on the next 5s poll with no explanation.

## Context

The PATCH route already returns structured errors: `404` for missing threads, `422` with `{ error: { code, message } }` for invalid state/priority transitions. The client never reads these. Both `patchThread` definitions are identical and duplicated across the two files.

**Files with the bug:**
- `src/web/components/Dashboard.tsx:31-36` — `patchThread` (no status check)
- `src/web/app/threads/page.tsx:30-36` — identical `patchThread` (no status check)

**All callers in scope:**
- `markDone`, `setWaiting`, `archiveThread`, `unarchiveThread`, `updateNextAction`, `updatePriority`

## Acceptance Criteria

- [ ] Given a PATCH call returns a non-2xx response, when the action handler resolves, then an error Snackbar appears at the bottom of the page with the server's error message (or a generic fallback)
- [ ] Given the error Snackbar is shown, when 4 seconds pass, then it auto-dismisses
- [ ] Given the error Snackbar is shown, when the user clicks the dismiss icon, then it closes immediately
- [ ] Given a PATCH call succeeds, when the action handler resolves, then no Snackbar is shown and the UI updates normally
- [ ] Given a fetch network error (no response), when the action handler rejects, then the Snackbar shows "Network error — please try again"
- [ ] The `patchThread` helper is defined once in `src/web/lib/api.ts` and imported by both `Dashboard.tsx` and `threads/page.tsx`, removing the duplication

## Technical Design

### Data Model Changes

None.

### API / Interface Changes

None — the PATCH route is unchanged.

### Key Logic

**`patchThread` refactored to throw on failure** — `src/web/lib/api.ts` (new shared file):

```typescript
export async function patchThread(id: string, patch: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/threads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.error?.message ?? `Request failed (${res.status})`
    throw new Error(message)
  }
}
```

**Error state in each page component:**

```typescript
const [errorMsg, setErrorMsg] = useState<string | null>(null)

async function markDone(id: string) {
  try {
    await patchThread(id, { state: 'closed' })
    await mutateAll()
  } catch (err) {
    setErrorMsg(err instanceof Error ? err.message : 'Network error — please try again')
  }
}
```

**Snackbar (MUI, already in project):**

```tsx
<Snackbar
  data-testid="error-snackbar"
  open={Boolean(errorMsg)}
  autoHideDuration={4000}
  onClose={() => setErrorMsg(null)}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
>
  <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>
</Snackbar>
```

## Test Scenarios

### Happy Path
1. User clicks FINISH → PATCH returns 200 → no Snackbar, thread card shows "CLOSED"
2. User changes priority → PATCH returns 200 → no Snackbar, badge updates

### Edge Cases
1. PATCH returns 404 (thread deleted between poll cycles) → Snackbar shows server error message → UI reverts to server state on next 5s poll
2. User dismisses Snackbar, then triggers another error → Snackbar reappears with new message
3. Two rapid actions both fail → second error replaces first in Snackbar

### Error Cases
1. Network offline during PATCH → `fetch` rejects → Snackbar shows "Network error — please try again"
2. PATCH returns 422 invalid state → Snackbar shows the `error.message` from the response body

## Out of Scope

- Optimistic UI updates (thread cards reverting on error) — currently pessimistic, stays pessimistic
- Per-field inline error indicators on the thread card itself
- Retry logic on failure
- Error logging to `~/.finnisher/hook.log` (this is web-only, no hook involvement)
- POST `/api/threads` error handling (ThreadForm already has its own validation flow)

## Non-Functional Requirements

No external integrations, analytics, metrics, or observability needed — this is a pure UI error surface for a local-only tool.

## Open Questions

None.

## Implementation Notes

- Create `src/web/lib/api.ts` exporting `patchThread`. Both `Dashboard.tsx` and `threads/page.tsx` import from there.
- MUI `Snackbar` and `Alert` are already available — no new dependencies.
- Keep `errorMsg` state local to each page component — the two pages are independent routes.
- `data-testid="error-snackbar"` on the Snackbar root for Playwright targeting.
- Both the Dashboard page and the /threads page need the Snackbar added.
