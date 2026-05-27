import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finn-lc-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  vi.resetModules()
  const { runMigrations } = await import('../db/migrate.js')
  runMigrations()
  const { createThread } = await import('../db/threads.js')
  const thread = createThread({ title: 'Test Thread', nextAction: 'Ship it', state: 'open', owner: 'you' })
  const lc = await import('../db/launchCriteria.js')
  return { thread, lc }
}

afterEach(async () => {
  const { _resetDb } = await import('../db/db.js')
  _resetDb()
  vi.resetModules()
  delete process.env['FINNISHER_DB_PATH']
})

describe('getLaunchCriteria', () => {
  it('returns empty array when no criteria exist for a thread', async () => {
    const { thread, lc } = await setup()
    expect(lc.getLaunchCriteria(thread.id)).toEqual([])
  })
})

describe('addLaunchCriterion', () => {
  it('creates a criterion and returns it with checked=false', async () => {
    const { thread, lc } = await setup()
    const criterion = lc.addLaunchCriterion(thread.id, 'Deployed to prod')
    expect(criterion.text).toBe('Deployed to prod')
    expect(criterion.checked).toBe(false)
    expect(criterion.threadId).toBe(thread.id)
  })

  it('increments position for each new criterion', async () => {
    const { thread, lc } = await setup()
    const a = lc.addLaunchCriterion(thread.id, 'First')
    const b = lc.addLaunchCriterion(thread.id, 'Second')
    expect(b.position).toBeGreaterThan(a.position)
  })
})

describe('toggleLaunchCriterion', () => {
  it('marks a criterion checked and sets checkedAt', async () => {
    const { thread, lc } = await setup()
    const c = lc.addLaunchCriterion(thread.id, 'Ship it')
    lc.toggleLaunchCriterion(c.id, true)
    const [updated] = lc.getLaunchCriteria(thread.id)
    expect(updated.checked).toBe(true)
    expect(updated.checkedAt).not.toBeNull()
  })

  it('marks a criterion unchecked and clears checkedAt', async () => {
    const { thread, lc } = await setup()
    const c = lc.addLaunchCriterion(thread.id, 'Ship it')
    lc.toggleLaunchCriterion(c.id, true)
    lc.toggleLaunchCriterion(c.id, false)
    const [updated] = lc.getLaunchCriteria(thread.id)
    expect(updated.checked).toBe(false)
    expect(updated.checkedAt).toBeNull()
  })
})

describe('deleteLaunchCriterion', () => {
  it('removes the criterion from the list', async () => {
    const { thread, lc } = await setup()
    const c = lc.addLaunchCriterion(thread.id, 'Deploy')
    lc.deleteLaunchCriterion(c.id)
    expect(lc.getLaunchCriteria(thread.id)).toHaveLength(0)
  })
})

describe('isLaunchReady', () => {
  it('returns false when no criteria exist', async () => {
    const { thread, lc } = await setup()
    expect(lc.isLaunchReady(thread.id)).toBe(false)
  })

  it('returns false when some criteria are unchecked', async () => {
    const { thread, lc } = await setup()
    const c1 = lc.addLaunchCriterion(thread.id, 'First')
    lc.addLaunchCriterion(thread.id, 'Second')
    lc.toggleLaunchCriterion(c1.id, true)
    expect(lc.isLaunchReady(thread.id)).toBe(false)
  })

  it('returns true when all criteria are checked', async () => {
    const { thread, lc } = await setup()
    const c1 = lc.addLaunchCriterion(thread.id, 'First')
    const c2 = lc.addLaunchCriterion(thread.id, 'Second')
    lc.toggleLaunchCriterion(c1.id, true)
    lc.toggleLaunchCriterion(c2.id, true)
    expect(lc.isLaunchReady(thread.id)).toBe(true)
  })
})
