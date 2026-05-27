import { test, expect } from '@playwright/test'
import { resetAll, seedThread, seedSession } from './helpers'

async function seedSprintCandidate(
  request: Parameters<typeof seedThread>[0],
  title = 'Sprint Thread',
) {
  const res = await seedThread(request, { title, nextAction: 'Final push' })
  const thread = await res.json() as { id: string }
  const id = thread.id

  // 1 todo, mark it done → contributes todos term (0.4)
  const todoRes = await request.post(`/api/threads/${id}/todos`, {
    data: { text: 'Ship feature' },
  })
  const { todo } = await todoRes.json() as { todo: { id: string } }
  await request.patch(`/api/todos/${todo.id}`, { data: { done: true } })

  // 3 sessions → sessions term (0.2)
  for (let i = 0; i < 3; i++) {
    await seedSession(request, { threadId: id })
  }
  // no blockers → blockers term (0.2)
  // total: 0.4 + 0.2 + 0.2 = 0.8 >= 0.75

  return id
}

test.beforeEach(async ({ request }) => {
  await resetAll(request)
})

test('Sprint Candidates section is hidden when no threads qualify', async ({ request, page }) => {
  await seedThread(request, { title: 'Normal thread' })
  await page.goto('/')
  await expect(page.getByTestId('sprint-candidates-section')).toHaveCount(0)
})

test('Sprint Candidates section appears when a thread has completionPct >= 0.75', async ({ request, page }) => {
  await seedSprintCandidate(request, 'Almost Done')
  await page.goto('/')
  await expect(page.getByTestId('sprint-candidates-section')).toBeVisible()
})

test('Sprint Candidates section shows the qualifying thread with [~DONE] badge', async ({ request, page }) => {
  await seedSprintCandidate(request, 'Ship It Thread')
  await page.goto('/')
  const section = page.getByTestId('sprint-candidates-section')
  await expect(section).toBeVisible()
  await expect(section).toContainText('Ship It Thread')
  await expect(section.getByTestId('sprint-done-badge')).toBeVisible()
})

test('Sprint Candidates section does not show threads with completionPct < 0.75', async ({ request, page }) => {
  await seedThread(request, { title: 'Low progress thread' })
  await seedSprintCandidate(request, 'Sprint thread')
  await page.goto('/')
  const section = page.getByTestId('sprint-candidates-section')
  await expect(section).toBeVisible()
  await expect(section).not.toContainText('Low progress thread')
})
