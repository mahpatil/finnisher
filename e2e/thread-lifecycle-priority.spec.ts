import { test, expect } from '@playwright/test'
import { resetAll, seedThread } from './helpers'

test.beforeEach(async ({ request }) => {
  await resetAll(request)
})

// ── AC 10: State filter chips on Threads tab ──────────────────────────────────

test('threads tab shows state filter bar with all expected chips', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  const bar = page.getByTestId('state-filter-bar')
  await expect(bar).toBeVisible()

  for (const label of ['All', 'New', 'Open', 'Waiting', 'Blocked', 'Closed', 'Archived']) {
    await expect(bar.getByText(label, { exact: true })).toBeVisible()
  }
})

test('state chip All shows all non-archived threads by default', async ({ request, page }) => {
  await seedThread(request, { title: 'Open thread', state: 'open' })
  await seedThread(request, { title: 'Waiting thread', state: 'waiting' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  await expect(page.getByTestId('thread-card')).toHaveCount(2)
})

test('state chip Open filters to open threads only', async ({ request, page }) => {
  await seedThread(request, { title: 'Open thread', state: 'open' })
  await seedThread(request, { title: 'Waiting thread', state: 'waiting' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  await page.getByTestId('state-chip-open').click()

  const cards = page.getByTestId('thread-card')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Open thread')
})

test('state chip Archived shows only archived threads', async ({ request, page }) => {
  await seedThread(request, { title: 'Active thread', state: 'open' })
  await seedThread(request, { title: 'Archived thread', state: 'archived' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  await page.getByTestId('state-chip-archived').click()

  const cards = page.getByTestId('thread-card')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Archived thread')
})

// ── AC 11: Priority filter chips on Threads tab ───────────────────────────────

test('threads tab shows priority filter bar with all expected chips', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  const bar = page.getByTestId('priority-filter-bar')
  await expect(bar).toBeVisible()

  for (const label of ['All', 'NOW', 'NEXT', 'LATER', 'OUT']) {
    await expect(bar.getByText(label, { exact: true })).toBeVisible()
  }
})

test('priority chip NOW filters threads to now priority', async ({ request, page }) => {
  await seedThread(request, { title: 'Urgent thread', priority: 'now' })
  await seedThread(request, { title: 'Backlog thread', priority: 'later' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  await page.getByTestId('priority-chip-now').click()

  const cards = page.getByTestId('thread-card')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Urgent thread')
})

test('state and priority filters combine to narrow results', async ({ request, page }) => {
  await seedThread(request, { title: 'Open + NOW', state: 'open', priority: 'now' })
  await seedThread(request, { title: 'Open + LATER', state: 'open', priority: 'later' })
  await seedThread(request, { title: 'Waiting + NOW', state: 'waiting', priority: 'now' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  await page.getByTestId('state-chip-open').click()
  await page.getByTestId('priority-chip-now').click()

  const cards = page.getByTestId('thread-card')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Open + NOW')
})

// ── AC 12: Priority badge on thread card ──────────────────────────────────────

test('thread card shows priority badge with correct label', async ({ request, page }) => {
  await seedThread(request, { title: 'NOW thread', priority: 'now' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  const badge = page.getByTestId('priority-badge').first()
  await expect(badge).toBeVisible()
  await expect(badge).toContainText('NOW')
})

test('priority badge shows NEXT for next priority', async ({ request, page }) => {
  await seedThread(request, { title: 'NEXT thread', priority: 'next' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  await expect(page.getByTestId('priority-badge').first()).toContainText('NEXT')
})

test('priority badge shows LATER for later priority', async ({ request, page }) => {
  await seedThread(request, { title: 'LATER thread', priority: 'later' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  await expect(page.getByTestId('priority-badge').first()).toContainText('LATER')
})

test('priority badge shows OUT for out priority', async ({ request, page }) => {
  await seedThread(request, { title: 'OUT thread', priority: 'out' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  await expect(page.getByTestId('priority-badge').first()).toContainText('OUT')
})

// ── AC 13: Archive button on thread card ──────────────────────────────────────

test('thread card shows archive button for non-archived thread', async ({ request, page }) => {
  await seedThread(request, { title: 'Archivable thread', state: 'open' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  await expect(page.getByTestId('archive-btn')).toBeVisible()
})

test('clicking archive button moves thread to archived state', async ({ request, page }) => {
  await seedThread(request, { title: 'Archive me', state: 'open' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()

  await page.getByTestId('archive-btn').first().click()

  // Thread disappears from default All view (non-archived)
  await expect(page.getByTestId('thread-card')).toHaveCount(0, { timeout: 8000 })

  // Appears under Archived filter
  await page.getByTestId('state-chip-archived').click()
  const cards = page.getByTestId('thread-card')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Archive me')
})

// ── AC 14: Unarchive button on archived thread ────────────────────────────────

test('archived thread shows unarchive button when Archived filter is active', async ({ request, page }) => {
  await seedThread(request, { title: 'Archived one', state: 'archived' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()
  await page.getByTestId('state-chip-archived').click()

  await expect(page.getByTestId('unarchive-btn')).toBeVisible()
})

test('clicking unarchive restores thread to open state', async ({ request, page }) => {
  await seedThread(request, { title: 'Restore me', state: 'archived' })
  await page.goto('/')
  await page.getByRole('tab', { name: /threads/i }).click()
  await page.getByTestId('state-chip-archived').click()

  await expect(page.getByTestId('thread-card')).toHaveCount(1)
  await page.getByTestId('unarchive-btn').first().click()

  // Archived filter now shows 0
  await expect(page.getByTestId('thread-card')).toHaveCount(0, { timeout: 8000 })

  // Back to All — thread is visible again
  await page.getByTestId('state-chip-all').click()
  await expect(page.getByTestId('thread-card')).toHaveCount(1)
  await expect(page.getByTestId('thread-card')).toContainText('Restore me')
})
