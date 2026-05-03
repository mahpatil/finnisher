import { test, expect } from '@playwright/test'

async function resetAll(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.request.post('/api/threads/seed', { data: { reset: true } })
  await page.request.post('/api/sessions/seed', { data: { reset: true } })
}

async function seedThread(page: Parameters<Parameters<typeof test>[1]>[0], data: {
  title?: string
  state?: string
  nextAction?: string
  owner?: string
  updatedAt?: string
}) {
  return page.request.post('/api/threads/seed', { data })
}

async function seedSession(page: Parameters<Parameters<typeof test>[1]>[0], data: Record<string, unknown>) {
  return page.request.post('/api/sessions/seed', { data })
}

test.beforeEach(async ({ page }) => {
  await resetAll(page)
})

// Criterion 1: finn web starts and dashboard accessible
test('dashboard loads Active tab by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('tab', { name: /active/i })).toBeVisible()
})

// Criterion 2: Active tab shows active threads
test('Active tab shows active threads', async ({ page }) => {
  await seedThread(page, { title: 'Test Thread', state: 'active', nextAction: 'Do something' })
  await page.goto('/')
  await page.getByRole('tab', { name: /active/i }).click()
  await expect(page.getByTestId('thread-card')).toBeVisible()
  await expect(page.getByTestId('thread-card')).toContainText('Test Thread')
})

// Criterion 3: Stalled thread shows red warning
test('stalled thread shows stalled warning in card', async ({ page }) => {
  const staleDate = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString()
  await seedThread(page, {
    title: 'Stalled Thread',
    state: 'active',
    nextAction: 'Do something',
    updatedAt: staleDate,
  })
  await page.goto('/')
  await expect(page.getByTestId('stalled-warning')).toBeVisible()
})

// Criterion 4: Active tab header shows "Active (N/5)" when ≤5 active
test('Active tab header shows count N/5 with no warning banner when 2 active threads', async ({ page }) => {
  await seedThread(page, { title: 'Thread 1', state: 'active', nextAction: 'action 1' })
  await seedThread(page, { title: 'Thread 2', state: 'active', nextAction: 'action 2' })
  await page.goto('/')
  await expect(page.getByRole('tab', { name: /active.*2.*5/i })).toBeVisible()
  await expect(page.getByTestId('focus-warning-banner')).toHaveCount(0)
})

// Criterion 5: 6-8 active → yellow caution banner with top 3 suggestions
test('caution banner appears with 6 active threads', async ({ page }) => {
  for (let i = 1; i <= 6; i++) {
    await seedThread(page, { title: `Thread ${i}`, state: 'active', nextAction: `action ${i}` })
  }
  await page.goto('/')
  const banner = page.getByTestId('focus-warning-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toHaveAttribute('data-severity', 'caution')
  await expect(page.getByTestId('suggestion-item')).toHaveCount(3)
})

// Criterion 6: 9+ active → red/urgent banner
test('urgent banner appears with 9 active threads', async ({ page }) => {
  for (let i = 1; i <= 9; i++) {
    await seedThread(page, { title: `Thread ${i}`, state: 'active', nextAction: `action ${i}` })
  }
  await page.goto('/')
  const banner = page.getByTestId('focus-warning-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toHaveAttribute('data-severity', 'urgent')
})

// Criterion 7: Add Thread button always visible and enabled
test('Add Thread button is always visible and enabled', async ({ page }) => {
  await page.goto('/')
  const addBtn = page.getByRole('button', { name: /add thread/i })
  await expect(addBtn).toBeVisible()
  await expect(addBtn).toBeEnabled()
})

// Criterion 8: Mark Done moves thread from Active
test('Mark Done button moves thread out of Active tab', async ({ page }) => {
  await seedThread(page, { title: 'Active Thread', state: 'active', nextAction: 'Do it' })
  await page.goto('/')
  await page.getByRole('tab', { name: /active/i }).click()
  await expect(page.getByTestId('thread-card')).toBeVisible()
  await page.getByRole('button', { name: /mark done/i }).first().click()
  await expect(page.getByTestId('thread-card')).toHaveCount(0)
})

// Criterion 9: Set Waiting moves thread to Waiting tab
test('Set Waiting button moves thread to Waiting tab', async ({ page }) => {
  await seedThread(page, { title: 'Active Thread', state: 'active', nextAction: 'Do it' })
  await page.goto('/')
  await page.getByRole('button', { name: /set waiting/i }).first().click()
  await page.getByRole('tab', { name: /waiting/i }).click()
  await expect(page.getByTestId('thread-card')).toContainText('Active Thread')
})

// Criterion 10: Edit Next Action inline
test('Edit Next Action saves inline on Enter', async ({ page }) => {
  await seedThread(page, { title: 'Editable Thread', state: 'active', nextAction: 'Old action' })
  await page.goto('/')
  await page.getByRole('button', { name: /edit next action/i }).first().click()
  const input = page.getByTestId('next-action-input')
  await input.fill('New action')
  await input.press('Enter')
  await expect(page.getByTestId('next-action-text')).toContainText('New action')
})

// Criterion 12: Sessions tab shows agent icon, duration, tokens, cost, branch, commit msg, unpushed
test('Sessions tab shows session data', async ({ page }) => {
  await seedSession(page, {
    agent: 'claude_code',
    startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endedAt: new Date().toISOString(),
    tokensIn: 1000,
    tokensOut: 500,
    costUsd: 0.05,
    gitBranch: 'main',
    lastCommitMsg: 'feat: add something',
    unpushedCount: 0,
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /sessions/i }).click()
  await expect(page.getByTestId('agent-badge')).toContainText('Claude')
  await expect(page.getByTestId('session-tokens')).toBeVisible()
  await expect(page.getByTestId('session-cost')).toBeVisible()
})

// Criterion 13: unpushedCount > 0 → highlighted red/amber
test('unpushed count > 0 is highlighted', async ({ page }) => {
  await seedSession(page, {
    agent: 'claude_code',
    startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endedAt: new Date().toISOString(),
    unpushedCount: 3,
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /sessions/i }).click()
  await expect(page.getByTestId('unpushed-count')).toBeVisible()
  await expect(page.getByTestId('unpushed-count')).toContainText('3')
})

// Criterion 14: Stalled tab shows only stalled threads
test('Stalled tab shows only stalled threads', async ({ page }) => {
  const staleDate = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString()
  await seedThread(page, { title: 'Stalled Thread', state: 'active', nextAction: 'Do it', updatedAt: staleDate })
  await seedThread(page, { title: 'Fresh Thread', state: 'active', nextAction: 'Do it too' })
  await page.goto('/')
  await page.getByRole('tab', { name: /stalled/i }).click()
  await expect(page.getByTestId('thread-card')).toHaveCount(1)
  await expect(page.getByTestId('thread-card')).toContainText('Stalled Thread')
})

// Criterion 15: Done tab shows completed threads sorted by completedAt DESC, max 30
test('Done tab shows completed threads', async ({ page }) => {
  await seedThread(page, { title: 'Done Thread', state: 'done', nextAction: 'n/a' })
  await page.goto('/')
  await page.getByRole('tab', { name: /done/i }).click()
  await expect(page.getByTestId('thread-card')).toContainText('Done Thread')
})
