## What
Surface PATCH errors in the Finnisher dashboard UI so users know when a Mark Done / Set Waiting / Edit Next Action call fails, rather than silently dropping the error.

## Why
`patchThread()` in `Dashboard.tsx` has no `.catch` or try/catch. A network error (port not bound, process restarted) leaves the UI optimistically stale until the next 5s SWR poll, with no user feedback. Discovered in reviewer pass — rated non-blocking but confusing at runtime.

## How
Wrap `patchThread` calls in try/catch and show a brief MUI `Snackbar`/`Alert` on failure (e.g. "Failed to update thread — retrying…"). Dismiss automatically after 4s.
