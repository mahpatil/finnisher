import { test, expect } from '@playwright/test'
import { resetAll, seedThread } from './helpers'

test.beforeEach(async ({ request }) => {
  await resetAll(request)
})

async function mockPatchFail(page: import('@playwright/test').Page, status = 404, message = 'Not found') {
  await page.route('/api/threads/**', async (route) => {
    if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'TEST_ERROR', message } }),
      })
    } else {
      await route.continue()
    }
  })
}

test('error snackbar appears when PATCH returns 404 on dashboard', async ({ page }) => {
  await seedThread(page.request, { title: 'Doomed Thread', state: 'open' })
  await mockPatchFail(page)

  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')

  await page.getByRole('button', { name: /FINISH/i }).first().click()

  await expect(page.getByTestId('error-snackbar')).toBeVisible()
})

test('error snackbar auto-dismisses after 4 seconds', async ({ page }) => {
  await seedThread(page.request, { title: 'Gone Thread', state: 'open' })
  await mockPatchFail(page)

  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')

  await page.getByRole('button', { name: /FINISH/i }).first().click()
  await expect(page.getByTestId('error-snackbar')).toBeVisible()

  await page.waitForTimeout(4500)
  await expect(page.getByTestId('error-snackbar')).not.toBeVisible()
})

test('error snackbar closes immediately when dismiss icon is clicked', async ({ page }) => {
  await seedThread(page.request, { title: 'Close Me', state: 'open' })
  await mockPatchFail(page)

  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')

  await page.getByRole('button', { name: /FINISH/i }).first().click()
  await expect(page.getByTestId('error-snackbar')).toBeVisible()

  await page.getByTestId('error-snackbar').getByRole('button', { name: /close/i }).click()
  await expect(page.getByTestId('error-snackbar')).not.toBeVisible()
})

test('no error snackbar shown when PATCH succeeds', async ({ page }) => {
  await seedThread(page.request, { title: 'Happy Thread', state: 'open' })

  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')

  await page.getByRole('button', { name: /FINISH/i }).first().click()

  await page.waitForTimeout(500)
  const snackbar = page.getByTestId('error-snackbar')
  const count = await snackbar.count()
  if (count > 0) {
    await expect(snackbar).not.toBeVisible()
  }
})

test('error snackbar appears on /threads page when PATCH fails', async ({ page }) => {
  await seedThread(page.request, { title: 'Threads Page Error', state: 'open' })
  await mockPatchFail(page)

  await page.goto('/threads')
  await page.waitForSelector('[data-testid="thread-card"]')

  await page.getByRole('button', { name: /FINISH/i }).first().click()

  await expect(page.getByTestId('error-snackbar')).toBeVisible()
})
