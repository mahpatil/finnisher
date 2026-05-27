import { test, expect } from '@playwright/test'

async function seedSession(page: Parameters<Parameters<typeof test>[1]>[0], data: {
  agent?: string
  folderName?: string | null
  githubUrl?: string | null
}) {
  await page.request.post('/api/sessions/seed', { data })
}

async function resetSessions(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.request.post('/api/sessions/seed', { data: { reset: true } })
}

test.beforeEach(async ({ page }) => {
  await resetSessions(page)
})

test.describe('SessionCard — 6.1 folderName badge', () => {
  test('shows folder-badge when session has a folderName', async ({ page }) => {
    await seedSession(page, { agent: 'claude_code', folderName: 'finnisher' })
    await page.goto('/sessions')
    await page.waitForSelector('[data-testid="session-card"]')
    await expect(page.getByTestId('folder-badge').first()).toContainText('finnisher')
  })

  test('does not show folder-badge when session has no folderName', async ({ page }) => {
    await seedSession(page, { agent: 'manual', folderName: null })
    await page.goto('/sessions')
    await page.waitForSelector('[data-testid="session-card"]')
    await expect(page.getByTestId('folder-badge')).toHaveCount(0)
  })
})

test.describe('SessionCard — 6.3 intent text', () => {
  test('shows intent text when session has intent set', async ({ page }) => {
    const seedRes = await page.request.post('/api/sessions/seed', {
      data: { agent: 'claude_code', intent: 'Implement the login feature' },
    })
    const seeded = await seedRes.json() as { id: string }
    await page.goto('/sessions')
    await page.waitForSelector('[data-testid="session-card"]')
    await expect(page.getByTestId('session-intent').first()).toContainText('Implement the login feature')
    void seeded
  })

  test('does not show intent element when session has no intent', async ({ page }) => {
    await seedSession(page, { agent: 'manual' })
    await page.goto('/sessions')
    await page.waitForSelector('[data-testid="session-card"]')
    await expect(page.getByTestId('session-intent')).toHaveCount(0)
  })
})

test.describe('SessionCard — 6.2 githubUrl link', () => {
  test('shows github-link when session has a githubUrl', async ({ page }) => {
    await seedSession(page, {
      agent: 'claude_code',
      githubUrl: 'https://github.com/mahpatil/finnisher',
    })
    await page.goto('/sessions')
    await page.waitForSelector('[data-testid="github-link"]')
    const link = page.getByTestId('github-link').first()
    await expect(link).toHaveAttribute('href', 'https://github.com/mahpatil/finnisher')
    await expect(link).toHaveAttribute('target', '_blank')
  })

  test('does not show github-link when session has no githubUrl', async ({ page }) => {
    await seedSession(page, { agent: 'manual', githubUrl: null })
    await page.goto('/sessions')
    await page.waitForSelector('[data-testid="session-card"]')
    await expect(page.getByTestId('github-link')).toHaveCount(0)
  })
})
