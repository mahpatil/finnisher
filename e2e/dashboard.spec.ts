import { test, expect } from '@playwright/test'
import { resetAll, seedThread, seedSession } from './helpers'

test.beforeEach(async ({ request }) => {
  await resetAll(request)
})

// ── Default tab ──────────────────────────────────────────────────────────────

test('dashboard loads Active tab by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('tab', { name: /active/i })).toHaveAttribute('aria-selected', 'true')
})

// ── Active tab ───────────────────────────────────────────────────────────────

test('Active tab shows seeded threads', async ({ request, page }) => {
  await seedThread(request, { title: 'Test Thread', nextAction: 'Do something' })
  await page.goto('/')
  await expect(page.getByTestId('thread-card')).toContainText('Test Thread')
})

test('Active tab header shows count N/5 with no warning banner when ≤5 threads', async ({ request, page }) => {
  await seedThread(request, { title: 'Thread 1' })
  await seedThread(request, { title: 'Thread 2' })
  await page.goto('/')
  await expect(page.getByRole('tab', { name: /active.*2.*5/i })).toBeVisible()
  await expect(page.getByTestId('focus-warning-banner')).toHaveCount(0)
})

test('empty Active tab shows empty-state message', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No active threads')).toBeVisible()
})

// ── Focus warning banner ─────────────────────────────────────────────────────

test('caution banner appears with 6 active threads and shows 3 suggestions', async ({ request, page }) => {
  for (let i = 1; i <= 6; i++) {
    await seedThread(request, { title: `Thread ${i}`, nextAction: `action ${i}` })
  }
  await page.goto('/')
  const banner = page.getByTestId('focus-warning-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toHaveAttribute('data-severity', 'caution')
  await expect(page.getByTestId('suggestion-item')).toHaveCount(3)
})

test('urgent banner appears with 9 active threads', async ({ request, page }) => {
  for (let i = 1; i <= 9; i++) {
    await seedThread(request, { title: `Thread ${i}`, nextAction: `action ${i}` })
  }
  await page.goto('/')
  const banner = page.getByTestId('focus-warning-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toHaveAttribute('data-severity', 'urgent')
})

test('banner Done button marks suggestion done and hides banner at 5 active', async ({ request, page }) => {
  for (let i = 1; i <= 6; i++) {
    await seedThread(request, { title: `Thread ${i}`, nextAction: `action ${i}` })
  }
  await page.goto('/')
  await expect(page.getByTestId('focus-warning-banner')).toBeVisible()

  await page.getByTestId('suggestion-item').first().getByRole('button', { name: 'Done' }).click()

  await expect(page.getByTestId('focus-warning-banner')).not.toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('tab', { name: 'Active (5/5)' })).toBeVisible()
})

// ── Add Thread ───────────────────────────────────────────────────────────────

test('Add Thread button is always visible and enabled', async ({ page }) => {
  await page.goto('/')
  const btn = page.getByRole('button', { name: /add thread/i })
  await expect(btn).toBeVisible()
  await expect(btn).toBeEnabled()
})

test('Add Thread button stays enabled even with 9 active threads', async ({ request, page }) => {
  for (let i = 1; i <= 9; i++) {
    await seedThread(request, { title: `Thread ${i}` })
  }
  await page.goto('/')
  await expect(page.getByRole('button', { name: /add thread/i })).toBeEnabled()
})

test('Add Thread form creates a thread and it appears in Active tab', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /add thread/i }).click()
  await page.getByTestId('thread-title-input').fill('Brand new thread')
  await page.getByTestId('thread-next-action-input').fill('Start immediately')
  await page.getByRole('button', { name: /^add$/i }).click()

  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('Brand new thread')).toBeVisible()
})

test('Add Thread shows validation error when fields are empty', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /add thread/i }).click()
  await page.getByRole('button', { name: /^add$/i }).click()
  const err = page.getByTestId('thread-form-error')
  await expect(err).toBeVisible()
  await expect(err).toContainText('required')
})

// ── Thread actions ───────────────────────────────────────────────────────────

test('Mark Done removes thread from Active tab', async ({ request, page }) => {
  await seedThread(request, { title: 'Active Thread', nextAction: 'Do it' })
  await page.goto('/')
  await page.getByRole('button', { name: /mark done/i }).first().click()
  await expect(page.getByTestId('thread-card')).toHaveCount(0)
})

test('Mark Done thread appears in Done tab', async ({ request, page }) => {
  await seedThread(request, { title: 'Finish this task', nextAction: 'Close it' })
  await page.goto('/')
  await page.getByRole('button', { name: /mark done/i }).first().click()
  await page.getByRole('tab', { name: /done/i }).click()
  await expect(page.getByText('Finish this task')).toBeVisible({ timeout: 10000 })
})

test('Set Waiting moves thread to Waiting tab', async ({ request, page }) => {
  await seedThread(request, { title: 'Waiting on review', nextAction: 'Park it' })
  await page.goto('/')
  await page.getByRole('button', { name: /set waiting/i }).first().click()
  await page.getByRole('tab', { name: /waiting/i }).click()
  await expect(page.getByText('Waiting on review')).toBeVisible({ timeout: 10000 })
})

test('Edit Next Action saves on Enter and updates display', async ({ request, page }) => {
  await seedThread(request, { title: 'Editable Thread', nextAction: 'Old action' })
  await page.goto('/')
  await page.getByRole('button', { name: /edit next action/i }).first().click()
  const input = page.getByTestId('next-action-input')
  await input.fill('New action text')
  await input.press('Enter')
  await expect(page.getByTestId('next-action-text')).toContainText('New action text')
})

// ── Stalled threads ──────────────────────────────────────────────────────────

test('stalled thread shows red stalled warning chip', async ({ request, page }) => {
  await seedThread(request, { title: 'Stalled Thread', stale: true })
  await page.goto('/')
  await expect(page.getByTestId('stalled-warning')).toBeVisible()
})

test('Stalled tab shows only stalled threads', async ({ request, page }) => {
  await seedThread(request, { title: 'Fresh Thread', nextAction: 'Active work' })
  await seedThread(request, { title: 'Stalled Thread', stale: true })
  await page.goto('/')
  await page.getByRole('tab', { name: /stalled/i }).click()
  await expect(page.getByTestId('thread-card')).toHaveCount(1)
  await expect(page.getByTestId('thread-card')).toContainText('Stalled Thread')
})

// ── Done tab ─────────────────────────────────────────────────────────────────

test('Done tab shows completed threads sorted newest first', async ({ request, page }) => {
  await seedThread(request, { title: 'Oldest done', state: 'done', completedAt: '2026-01-01T00:00:00Z' })
  await seedThread(request, { title: 'Middle done', state: 'done', completedAt: '2026-02-01T00:00:00Z' })
  await seedThread(request, { title: 'Newest done', state: 'done', completedAt: '2026-03-01T00:00:00Z' })
  await page.goto('/')
  await page.getByRole('tab', { name: /done/i }).click()
  const cards = page.getByTestId('thread-card')
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(0)).toContainText('Newest done')
  await expect(cards.nth(1)).toContainText('Middle done')
  await expect(cards.nth(2)).toContainText('Oldest done')
})

// ── SWR polling ──────────────────────────────────────────────────────────────

test('dashboard picks up CLI-added thread within 5s poll cycle', async ({ request, page }) => {
  test.slow()
  await page.goto('/')
  await expect(page.getByText('No active threads')).toBeVisible()

  await seedThread(request, { title: 'CLI-added thread' })

  await expect(page.getByText('CLI-added thread')).toBeVisible({ timeout: 7000 })
})

// ── Sessions tab ─────────────────────────────────────────────────────────────

test('Sessions tab shows agent badge, tokens, and cost', async ({ request, page }) => {
  await seedSession(request, {
    agent: 'claude_code',
    tokensIn: 1200,
    tokensOut: 800,
    costUsd: 0.12,
    gitBranch: 'feat/test',
    lastCommitMsg: 'feat: add e2e tests',
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /sessions/i }).click()
  await expect(page.getByTestId('agent-badge')).toContainText('Claude')
  await expect(page.getByTestId('session-tokens')).toContainText('1,200')
  await expect(page.getByTestId('session-cost')).toContainText('$0.12')
})

test('Sessions tab highlights unpushed commits', async ({ request, page }) => {
  await seedSession(request, { unpushedCount: 3 })
  await page.goto('/')
  await page.getByRole('tab', { name: /sessions/i }).click()
  const unpushed = page.getByTestId('unpushed-count')
  await expect(unpushed).toBeVisible()
  await expect(unpushed).toContainText('3')
})

test('running session shows green running indicator', async ({ request, page }) => {
  await seedSession(request, { endedAt: null })
  await page.goto('/')
  await page.getByRole('tab', { name: /sessions/i }).click()
  await expect(page.getByTestId('session-card')).toContainText('running')
})
