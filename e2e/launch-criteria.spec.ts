import { test, expect } from '@playwright/test'
import { resetAll, seedThread } from './helpers'

test.beforeEach(async ({ request }) => {
  await resetAll(request)
})

test.describe('Launch Gate in thread detail', () => {
  test('shows Launch Gate section when thread has criteria', async ({ request, page }) => {
    const res = await seedThread(request, { title: 'Ready to Ship' })
    const { id } = await res.json() as { id: string }
    await request.post(`/api/threads/${id}/launch-criteria`, {
      data: { text: 'All tests pass' },
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="thread-card"]')
    await page.getByTestId('thread-card').first().click()

    await expect(page.getByTestId('launch-gate-section')).toBeVisible()
    await expect(page.getByTestId('launch-gate-section')).toContainText('All tests pass')
  })

  test('hides Launch Gate section when thread has no criteria', async ({ request, page }) => {
    await seedThread(request, { title: 'No criteria thread' })

    await page.goto('/')
    await page.waitForSelector('[data-testid="thread-card"]')
    await page.getByTestId('thread-card').first().click()

    await expect(page.getByTestId('launch-gate-section')).toHaveCount(0)
  })

  test('clicking checkbox PATCHes criterion checked state', async ({ request, page }) => {
    const res = await seedThread(request, { title: 'Patch Test' })
    const { id } = await res.json() as { id: string }
    await request.post(`/api/threads/${id}/launch-criteria`, {
      data: { text: 'Deploy to prod' },
    })

    await page.goto('/')
    await page.waitForSelector('[data-testid="thread-card"]')
    await page.getByTestId('thread-card').first().click()

    const section = page.getByTestId('launch-gate-section')
    await expect(section).toBeVisible()

    const checkbox = section.getByRole('checkbox').first()
    await expect(checkbox).not.toBeChecked()
    await checkbox.click()
    await expect(checkbox).toBeChecked()
  })
})
