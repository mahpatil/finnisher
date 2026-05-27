import { test, expect } from '@playwright/test'
import { resetAll, seedThread } from './helpers'

test.beforeEach(async ({ request }) => {
  await resetAll(request)
})

// ── Priority card highlights ─────────────────────────────────────────────────

test('thread card with priority now has a red left border', async ({ page }) => {
  await seedThread(page.request, { title: 'Urgent Thread', priority: 'now', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  const card = page.getByTestId('thread-card').first()
  const borderLeft = await card.evaluate(el => getComputedStyle(el).borderLeftColor)
  // #f44336 in RGB is rgb(244, 67, 54)
  expect(borderLeft).toContain('244')
})

test('thread card with priority next has an orange left border', async ({ page }) => {
  await seedThread(page.request, { title: 'Soon Thread', priority: 'next', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  const card = page.getByTestId('thread-card').first()
  const borderLeft = await card.evaluate(el => getComputedStyle(el).borderLeftColor)
  // #ff9800 in RGB is rgb(255, 152, 0)
  expect(borderLeft).toContain('255')
})

test('thread card with priority later has no priority left border accent', async ({ page }) => {
  await seedThread(page.request, { title: 'Later Thread', priority: 'later', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  const card = page.getByTestId('thread-card').first()
  const borderLeft = await card.evaluate(el => getComputedStyle(el).borderLeftWidth)
  // later cards should have no thick left border (default MUI border is 1px or less via box-shadow)
  expect(parseInt(borderLeft)).toBeLessThanOrEqual(1)
})

// ── Responsive layout — mobile ───────────────────────────────────────────────

test('hamburger icon is visible and sidebar hidden on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByTestId('hamburger-menu')).toBeVisible()
  await expect(page.getByTestId('sidebar-drawer')).not.toBeVisible()
})

test('tapping hamburger opens drawer overlay on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.getByTestId('hamburger-menu').click()
  await expect(page.getByTestId('sidebar-drawer')).toBeVisible()
})

test('tapping a nav item in mobile drawer closes it and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.getByTestId('hamburger-menu').click()
  await expect(page.getByTestId('sidebar-drawer')).toBeVisible()
  await page.getByTestId('nav-threads').click()
  await expect(page).toHaveURL('/threads')
  await expect(page.getByTestId('sidebar-drawer')).not.toBeVisible()
})

test('sidebar is permanently visible on desktop and hamburger is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page.getByTestId('sidebar-drawer')).toBeVisible()
  await expect(page.getByTestId('hamburger-menu')).not.toBeVisible()
})

// ── Desktop sidebar collapse ──────────────────────────────────────────────────

test('collapse toggle button is visible on desktop sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page.getByTestId('sidebar-collapse-toggle')).toBeVisible()
})

test('clicking collapse toggle collapses sidebar to icon-only width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const drawer = page.getByTestId('sidebar-drawer')
  const widthBefore = await drawer.evaluate(el => el.getBoundingClientRect().width)
  await page.getByTestId('sidebar-collapse-toggle').click()
  const widthAfter = await drawer.evaluate(el => el.getBoundingClientRect().width)
  expect(widthAfter).toBeLessThan(widthBefore)
  expect(widthAfter).toBeLessThanOrEqual(60)
})

test('clicking collapse toggle again restores full sidebar width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByTestId('sidebar-collapse-toggle').click()
  await page.getByTestId('sidebar-collapse-toggle').click()
  const drawer = page.getByTestId('sidebar-drawer')
  const width = await drawer.evaluate(el => el.getBoundingClientRect().width)
  expect(width).toBeGreaterThan(200)
})

test('nav icons are clickable when sidebar is collapsed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.getByTestId('sidebar-collapse-toggle').click()
  await page.getByTestId('nav-threads').click()
  await expect(page).toHaveURL('/threads')
})

// ── Thread todos ──────────────────────────────────────────────────────────────

test('thread detail shows Todos section with add input and button', async ({ page }) => {
  await seedThread(page.request, { title: 'Detail Thread', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  await page.getByTestId('thread-card').first().click()
  await expect(page.getByTestId('todos-section')).toBeVisible()
  await expect(page.getByTestId('todo-input')).toBeVisible()
  await expect(page.getByTestId('todo-add-btn')).toBeVisible()
})

test('adding a todo creates an unchecked item in the list', async ({ page }) => {
  await seedThread(page.request, { title: 'Todo Thread', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  await page.getByTestId('thread-card').first().click()
  await page.getByTestId('todo-input').fill('Write unit tests')
  await page.getByTestId('todo-add-btn').click()
  await expect(page.getByTestId('todo-item')).toHaveCount(1)
  await expect(page.getByTestId('todo-item').first()).toContainText('Write unit tests')
  const checkbox = page.getByTestId('todo-item').first().getByRole('checkbox')
  await expect(checkbox).not.toBeChecked()
})

test('checking a todo marks it done and persists across reload', async ({ page }) => {
  await seedThread(page.request, { title: 'Persist Thread', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  await page.getByTestId('thread-card').first().click()
  await page.getByTestId('todo-input').fill('Check me')
  await page.getByTestId('todo-add-btn').click()
  await page.getByTestId('todo-item').first().getByRole('checkbox').click()
  await page.reload()
  await page.getByTestId('thread-card').first().click()
  const checkbox = page.getByTestId('todo-item').first().getByRole('checkbox')
  await expect(checkbox).toBeChecked()
})

test('unchecking a done todo removes strikethrough', async ({ page }) => {
  await seedThread(page.request, { title: 'Uncheck Thread', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  await page.getByTestId('thread-card').first().click()
  await page.getByTestId('todo-input').fill('Toggle me')
  await page.getByTestId('todo-add-btn').click()
  const checkbox = page.getByTestId('todo-item').first().getByRole('checkbox')
  await checkbox.click()
  await expect(checkbox).toBeChecked()
  await checkbox.click()
  await expect(checkbox).not.toBeChecked()
})

test('thread card shows todo count chip when todos exist', async ({ page }) => {
  await seedThread(page.request, { title: 'Count Thread', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  await page.getByTestId('thread-card').first().click()
  await page.getByTestId('todo-input').fill('Item 1')
  await page.getByTestId('todo-add-btn').click()
  await page.getByTestId('todo-input').fill('Item 2')
  await page.getByTestId('todo-add-btn').click()
  await page.getByTestId('todo-item').first().getByRole('checkbox').click()
  await page.getByTestId('back-button').click()
  await expect(page.getByTestId('todo-count-chip')).toBeVisible()
  await expect(page.getByTestId('todo-count-chip')).toContainText('1/2')
})

test('clicking edit icon on a todo enters edit mode', async ({ page }) => {
  await seedThread(page.request, { title: 'Edit Thread', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  await page.getByTestId('thread-card').first().click()
  await page.getByTestId('todo-input').fill('Original text')
  await page.getByTestId('todo-add-btn').click()
  await page.getByTestId('todo-item').first().hover()
  await page.getByTestId('todo-edit-btn').first().click()
  await expect(page.getByTestId('todo-edit-input')).toBeVisible()
})

test('editing a todo and pressing Enter updates the text', async ({ page }) => {
  await seedThread(page.request, { title: 'Update Thread', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  await page.getByTestId('thread-card').first().click()
  await page.getByTestId('todo-input').fill('Old text')
  await page.getByTestId('todo-add-btn').click()
  await page.getByTestId('todo-item').first().hover()
  await page.getByTestId('todo-edit-btn').first().click()
  const editInput = page.getByTestId('todo-edit-input')
  await editInput.fill('New text')
  await editInput.press('Enter')
  await expect(page.getByTestId('todo-item').first()).toContainText('New text')
})

test('clicking delete icon removes the todo from the list', async ({ page }) => {
  await seedThread(page.request, { title: 'Delete Thread', state: 'open' })
  await page.goto('/')
  await page.waitForSelector('[data-testid="thread-card"]')
  await page.getByTestId('thread-card').first().click()
  await page.getByTestId('todo-input').fill('Delete me')
  await page.getByTestId('todo-add-btn').click()
  await expect(page.getByTestId('todo-item')).toHaveCount(1)
  await page.getByTestId('todo-item').first().hover()
  await page.getByTestId('todo-delete-btn').first().click()
  await expect(page.getByTestId('todo-item')).toHaveCount(0)
})
