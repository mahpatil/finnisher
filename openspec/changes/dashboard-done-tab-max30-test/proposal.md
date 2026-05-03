## What
Add a Playwright e2e test covering the "max 30" behaviour of the Done tab — seeding 35 completed threads and asserting the tab shows ≤ 30.

## Why
Spec criterion 15 says "completed threads sorted by completedAt DESC, max 30". The current test only checks that a single done thread appears; the cap is unverified. Discovered in reviewer pass.

## How
Add one test in `e2e/dashboard.spec.ts` that seeds 35 done threads via the seed API, navigates to the Done tab, and asserts `page.getByTestId('thread-card').count() === 30`.
