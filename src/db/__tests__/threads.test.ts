import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  const dbPath = tempDbPath()
  process.env['FINNISHER_DB_PATH'] = dbPath
  vi.resetModules()
  const { runMigrations } = await import('../migrate.js')
  runMigrations()
  const mod = await import('../threads.js')
  return { ...mod, dbPath }
}

afterEach(async () => {
  const { _resetDb } = await import('../db.js')
  _resetDb()
  vi.resetModules()
})

// ── createThread ───────────────────────────────────────────────────────────

describe('createThread', () => {
  it('persists a thread and returns it with a 10-char id', async () => {
    const { createThread, getThread } = await setup()
    const t = createThread({ title: 'Ship MVP', nextAction: 'Write schema', state: 'open', owner: 'you' })
    expect(t.id).toHaveLength(10)
    expect(t.title).toBe('Ship MVP')
    expect(t.nextAction).toBe('Write schema')
    expect(getThread(t.id)).toEqual(t)
  })

  it('sets createdAt and updatedAt to now', async () => {
    const { createThread } = await setup()
    const before = Date.now()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const after = Date.now()
    expect(t.createdAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(t.createdAt.getTime()).toBeLessThanOrEqual(after)
    expect(t.updatedAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('always succeeds regardless of how many open threads exist', async () => {
    const { createThread, listThreads } = await setup()
    for (let i = 0; i < 10; i++) {
      createThread({ title: `Thread ${i}`, nextAction: 'Do it', state: 'open', owner: 'you' })
    }
    expect(listThreads().filter(t => t.state === 'open')).toHaveLength(10)
  })

  it('accepts empty strings (validation is the CLI layer responsibility)', async () => {
    const { createThread } = await setup()
    expect(() => createThread({ title: '', nextAction: '', state: 'open', owner: 'you' })).not.toThrow()
  })
})

// ── listThreads / getThread ────────────────────────────────────────────────

describe('listThreads', () => {
  it('returns all threads', async () => {
    const { createThread, listThreads } = await setup()
    createThread({ title: 'A', nextAction: 'x', state: 'open', owner: 'you' })
    createThread({ title: 'B', nextAction: 'x', state: 'waiting', owner: 'you' })
    expect(listThreads()).toHaveLength(2)
  })
})

describe('getThread', () => {
  it('returns undefined for a nonexistent id without throwing', async () => {
    const { getThread } = await setup()
    expect(getThread('nonexistent')).toBeUndefined()
  })
})

// ── touchThread ────────────────────────────────────────────────────────────

describe('touchThread', () => {
  it('bumps updatedAt for an open thread without changing other fields', async () => {
    const { createThread, touchThread, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    await new Promise(r => setTimeout(r, 5))
    touchThread(t.id)
    const updated = getThread(t.id)!
    expect(updated.updatedAt.getTime()).toBeGreaterThan(t.updatedAt.getTime())
    expect(updated.title).toBe(t.title)
    expect(updated.nextAction).toBe(t.nextAction)
    expect(updated.state).toBe(t.state)
  })

  it('is a no-op for a closed thread', async () => {
    const { createThread, updateState, touchThread, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    updateState(t.id, 'closed')
    const closedBefore = getThread(t.id)!.updatedAt.getTime()
    await new Promise(r => setTimeout(r, 5))
    touchThread(t.id)
    expect(getThread(t.id)!.updatedAt.getTime()).toBe(closedBefore)
  })
})

// ── updateState ────────────────────────────────────────────────────────────

describe('updateState', () => {
  it('sets completedAt when transitioning to closed', async () => {
    const { createThread, updateState, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    expect(t.completedAt).toBeNull()
    updateState(t.id, 'closed')
    const closed = getThread(t.id)!
    expect(closed.state).toBe('closed')
    expect(closed.completedAt).toBeInstanceOf(Date)
  })

  it('does not set completedAt for non-closed transitions', async () => {
    const { createThread, updateState, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    updateState(t.id, 'waiting')
    expect(getThread(t.id)!.completedAt).toBeNull()
  })
})

// ── updateNextAction ───────────────────────────────────────────────────────

describe('updateNextAction', () => {
  it('updates nextAction and bumps updatedAt', async () => {
    const { createThread, updateNextAction, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'old', state: 'open', owner: 'you' })
    await new Promise(r => setTimeout(r, 5))
    updateNextAction(t.id, 'new action')
    const updated = getThread(t.id)!
    expect(updated.nextAction).toBe('new action')
    expect(updated.updatedAt.getTime()).toBeGreaterThan(t.updatedAt.getTime())
  })
})

// ── isStalled ──────────────────────────────────────────────────────────────

describe('isStalled', () => {
  it('returns true for an open thread untouched for more than 48h', async () => {
    const { createThread, isStalled, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const { getSqlite } = await import('../db.js')
    const staleTime = Date.now() - 49 * 60 * 60 * 1000
    getSqlite().prepare('UPDATE threads SET updated_at = ? WHERE id = ?').run(staleTime, t.id)
    const stale = getThread(t.id)!
    expect(isStalled(stale)).toBe(true)
  })

  it('returns false for a thread touched less than 48h ago', async () => {
    const { createThread, isStalled } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    expect(isStalled(t)).toBe(false)
  })

  it('returns false at exactly the 48h boundary (strict >)', async () => {
    const { createThread, isStalled, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const { getSqlite } = await import('../db.js')
    const justUnder48h = Date.now() - 48 * 60 * 60 * 1000 + 5000
    getSqlite().prepare('UPDATE threads SET updated_at = ? WHERE id = ?').run(justUnder48h, t.id)
    expect(isStalled(getThread(t.id)!)).toBe(false)
  })

  it('returns false for a closed thread even if very old', async () => {
    const { createThread, updateState, isStalled, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    updateState(t.id, 'closed')
    const { getSqlite } = await import('../db.js')
    getSqlite().prepare('UPDATE threads SET updated_at = ? WHERE id = ?').run(0, t.id)
    expect(isStalled(getThread(t.id)!)).toBe(false)
  })
})

// ── overloadWarning ────────────────────────────────────────────────────────

describe('overloadWarning', () => {
  it('returns null when open threads is 5 or fewer', async () => {
    const { createThread, listThreads, overloadWarning } = await setup()
    for (let i = 0; i < 5; i++) {
      createThread({ title: `T${i}`, nextAction: 'N', state: 'open', owner: 'you' })
    }
    expect(overloadWarning(listThreads())).toBeNull()
  })

  it('returns caution level when open count is 6', async () => {
    const { createThread, listThreads, overloadWarning } = await setup()
    for (let i = 0; i < 6; i++) {
      createThread({ title: `T${i}`, nextAction: 'N', state: 'open', owner: 'you' })
    }
    const w = overloadWarning(listThreads())
    expect(w?.level).toBe('caution')
    expect(w?.count).toBe(6)
  })

  it('returns caution level when open count is 8', async () => {
    const { createThread, listThreads, overloadWarning } = await setup()
    for (let i = 0; i < 8; i++) {
      createThread({ title: `T${i}`, nextAction: 'N', state: 'open', owner: 'you' })
    }
    expect(overloadWarning(listThreads())?.level).toBe('caution')
  })

  it('returns urgent level when open count is 9 or more', async () => {
    const { createThread, listThreads, overloadWarning } = await setup()
    for (let i = 0; i < 9; i++) {
      createThread({ title: `T${i}`, nextAction: 'N', state: 'open', owner: 'you' })
    }
    expect(overloadWarning(listThreads())?.level).toBe('urgent')
  })

  it('includes up to 3 suggestions sorted by oldest updatedAt first', async () => {
    const { createThread, listThreads, overloadWarning } = await setup()
    const { getSqlite } = await import('../db.js')
    for (let i = 0; i < 6; i++) {
      const t = createThread({ title: `T${i}`, nextAction: 'N', state: 'open', owner: 'you' })
      getSqlite().prepare('UPDATE threads SET updated_at = ? WHERE id = ?')
        .run(Date.now() - (6 - i) * 10000, t.id)
    }
    const w = overloadWarning(listThreads())
    expect(w?.suggestions).toHaveLength(3)
    expect(w?.suggestions[0].title).toBe('T0')
  })

  it('does not count waiting/closed threads toward the active threshold', async () => {
    const { createThread, listThreads, overloadWarning } = await setup()
    for (let i = 0; i < 5; i++) {
      createThread({ title: `T${i}`, nextAction: 'N', state: 'open', owner: 'you' })
    }
    createThread({ title: 'W', nextAction: 'N', state: 'waiting', owner: 'you' })
    createThread({ title: 'D', nextAction: 'N', state: 'closed', owner: 'you' })
    expect(overloadWarning(listThreads())).toBeNull()
  })
})

// ── deleteThread ───────────────────────────────────────────────────────────

describe('deleteThread', () => {
  it('removes the thread from the DB', async () => {
    const { createThread, deleteThread, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    deleteThread(t.id)
    expect(getThread(t.id)).toBeUndefined()
  })
})
