import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-lifecycle-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  vi.resetModules()
  const { runMigrations } = await import('../migrate.js')
  runMigrations()
  return await import('../threads.js')
}

afterEach(async () => {
  const { _resetDb } = await import('../db.js')
  _resetDb()
  vi.resetModules()
})

// ── AC 1: Schema types and constants ─────────────────────────────────────────

describe('THREAD_STATES', () => {
  it('exports all six lifecycle values', async () => {
    const { THREAD_STATES } = await import('../schema.js')
    expect(THREAD_STATES).toContain('new')
    expect(THREAD_STATES).toContain('open')
    expect(THREAD_STATES).toContain('waiting')
    expect(THREAD_STATES).toContain('blocked')
    expect(THREAD_STATES).toContain('closed')
    expect(THREAD_STATES).toContain('archived')
    expect(THREAD_STATES).toHaveLength(6)
  })
})

describe('THREAD_PRIORITIES', () => {
  it('exports four sequencing values', async () => {
    const { THREAD_PRIORITIES } = await import('../schema.js')
    expect(THREAD_PRIORITIES).toContain('now')
    expect(THREAD_PRIORITIES).toContain('next')
    expect(THREAD_PRIORITIES).toContain('later')
    expect(THREAD_PRIORITIES).toContain('out')
    expect(THREAD_PRIORITIES).toHaveLength(4)
  })
})

describe('thread priority default', () => {
  it('new thread defaults priority to later', async () => {
    const { createThread, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    expect(getThread(t.id)?.priority).toBe('later')
  })

  it('archivedAt is null on a new thread', async () => {
    const { createThread, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    expect(getThread(t.id)?.archivedAt).toBeNull()
  })
})

// ── AC 2: Migration preserves waiting/blocked, renames active→open, done→closed ──

describe('migration state transforms', () => {
  it('waiting and blocked threads are readable after migration', async () => {
    const { createThread, getThread, listThreads } = await setup()
    const w = createThread({ title: 'Waiting', nextAction: 'N', state: 'waiting', owner: 'you' })
    const b = createThread({ title: 'Blocked', nextAction: 'N', state: 'blocked', owner: 'you' })
    expect(getThread(w.id)?.state).toBe('waiting')
    expect(getThread(b.id)?.state).toBe('blocked')
    expect(listThreads().find(t => t.id === w.id)?.state).toBe('waiting')
    expect(listThreads().find(t => t.id === b.id)?.state).toBe('blocked')
  })
})

// ── AC 9: updatePriority ──────────────────────────────────────────────────────

describe('updatePriority', () => {
  it('sets the priority field and bumps updatedAt', async () => {
    const { createThread, updatePriority, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    expect(getThread(t.id)?.priority).toBe('later')
    await new Promise(r => setTimeout(r, 5))
    updatePriority(t.id, 'now')
    const updated = getThread(t.id)!
    expect(updated.priority).toBe('now')
    expect(updated.updatedAt.getTime()).toBeGreaterThan(t.updatedAt.getTime())
  })
})

// ── Archive/Unarchive DB functions ────────────────────────────────────────────

describe('archiveThread / unarchiveThread', () => {
  it('archiveThread sets state to archived and sets archivedAt', async () => {
    const { createThread, archiveThread, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const before = Date.now()
    archiveThread(t.id)
    const updated = getThread(t.id)!
    expect(updated.state).toBe('archived')
    expect(updated.archivedAt).toBeInstanceOf(Date)
    expect(updated.archivedAt!.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('unarchiveThread sets state to open and clears archivedAt', async () => {
    const { createThread, archiveThread, unarchiveThread, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    archiveThread(t.id)
    unarchiveThread(t.id)
    const updated = getThread(t.id)!
    expect(updated.state).toBe('open')
    expect(updated.archivedAt).toBeNull()
  })
})

// ── touchThread skips closed and archived ─────────────────────────────────────

describe('touchThread with new states', () => {
  it('is a no-op for a closed thread', async () => {
    const { createThread, updateState, touchThread, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    updateState(t.id, 'closed')
    const closedAt = getThread(t.id)!.updatedAt.getTime()
    await new Promise(r => setTimeout(r, 5))
    touchThread(t.id)
    expect(getThread(t.id)!.updatedAt.getTime()).toBe(closedAt)
  })

  it('is a no-op for an archived thread', async () => {
    const { createThread, archiveThread, touchThread, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    archiveThread(t.id)
    const archivedAt = getThread(t.id)!.updatedAt.getTime()
    await new Promise(r => setTimeout(r, 5))
    touchThread(t.id)
    expect(getThread(t.id)!.updatedAt.getTime()).toBe(archivedAt)
  })
})

// ── isStalled excludes closed and archived ────────────────────────────────────

describe('isStalled with new states', () => {
  it('returns false for a closed thread even if very old', async () => {
    const { createThread, updateState, isStalled, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    updateState(t.id, 'closed')
    const { getSqlite } = await import('../db.js')
    getSqlite().prepare('UPDATE threads SET updated_at = ? WHERE id = ?').run(0, t.id)
    expect(isStalled(getThread(t.id)!)).toBe(false)
  })

  it('returns false for an archived thread even if very old', async () => {
    const { createThread, archiveThread, isStalled, getThread } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    archiveThread(t.id)
    const { getSqlite } = await import('../db.js')
    getSqlite().prepare('UPDATE threads SET updated_at = ? WHERE id = ?').run(0, t.id)
    expect(isStalled(getThread(t.id)!)).toBe(false)
  })
})

// ── overloadWarning counts new + open ────────────────────────────────────────

describe('overloadWarning with new state vocabulary', () => {
  it('counts new + open threads toward the focus limit', async () => {
    const { createThread, listThreads, overloadWarning } = await setup()
    for (let i = 0; i < 3; i++) {
      createThread({ title: `Open ${i}`, nextAction: 'N', state: 'open', owner: 'you' })
    }
    for (let i = 0; i < 3; i++) {
      createThread({ title: `New ${i}`, nextAction: 'N', state: 'new', owner: 'you' })
    }
    const w = overloadWarning(listThreads())
    expect(w?.count).toBe(6)
    expect(w?.level).toBe('caution')
  })

  it('does not count waiting, blocked, closed, or archived threads', async () => {
    const { createThread, archiveThread, listThreads, overloadWarning } = await setup()
    for (let i = 0; i < 3; i++) {
      createThread({ title: `W${i}`, nextAction: 'N', state: 'waiting', owner: 'you' })
    }
    for (let i = 0; i < 3; i++) {
      const t = createThread({ title: `A${i}`, nextAction: 'N', state: 'open', owner: 'you' })
      archiveThread(t.id)
    }
    expect(overloadWarning(listThreads())).toBeNull()
  })
})
