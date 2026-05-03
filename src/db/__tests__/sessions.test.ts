import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { existsSync, rmSync } from 'fs'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  const dbPath = tempDbPath()
  process.env['FINNISHER_DB_PATH'] = dbPath
  vi.resetModules()
  const { runMigrations } = await import('../migrate.js')
  runMigrations()
  const mod = await import('../sessions.js')
  return { ...mod, dbPath }
}

afterEach(async () => {
  const { _resetDb } = await import('../db.js')
  _resetDb()
  vi.resetModules()
})

describe('createSession', () => {
  it('persists a session and returns it with a 10-char id', async () => {
    const { createSession, listSessions } = await setup()
    const s = createSession({ agent: 'manual', startedAt: new Date() })
    expect(s.id).toHaveLength(10)
    expect(s.agent).toBe('manual')
    expect(listSessions()).toHaveLength(1)
  })

  it('accepts null threadId (session not linked to a thread)', async () => {
    const { createSession } = await setup()
    const s = createSession({ agent: 'claude_code', startedAt: new Date(), threadId: null })
    expect(s.threadId).toBeNull()
  })

  it('creates an open session (endedAt is null)', async () => {
    const { createSession } = await setup()
    const s = createSession({ agent: 'codex', startedAt: new Date() })
    expect(s.endedAt).toBeNull()
  })
})

describe('closeSession', () => {
  it('sets endedAt and merges provided fields', async () => {
    const { createSession, closeSession, listSessions } = await setup()
    const s = createSession({ agent: 'manual', startedAt: new Date() })
    const endTime = new Date()
    closeSession(s.id, { endedAt: endTime, tokensIn: 1000, tokensOut: 200, costUsd: 0.05 })
    const closed = listSessions()[0]!
    expect(closed.endedAt?.getTime()).toBe(endTime.getTime())
    expect(closed.tokensIn).toBe(1000)
    expect(closed.tokensOut).toBe(200)
    expect(closed.costUsd).toBeCloseTo(0.05)
  })

  it('leaves other fields null when not provided', async () => {
    const { createSession, closeSession, listSessions } = await setup()
    const s = createSession({ agent: 'manual', startedAt: new Date() })
    closeSession(s.id, { endedAt: new Date() })
    const closed = listSessions()[0]!
    expect(closed.tokensIn).toBeNull()
    expect(closed.gitBranch).toBeNull()
  })
})

describe('listSessions', () => {
  it('returns all sessions by default', async () => {
    const { createSession, listSessions } = await setup()
    createSession({ agent: 'claude_code', startedAt: new Date() })
    createSession({ agent: 'codex', startedAt: new Date() })
    expect(listSessions()).toHaveLength(2)
  })

  it('filters by threadId when provided', async () => {
    const { createSession, listSessions } = await setup()
    // Create a thread first to get a valid FK
    const { createThread } = await import('../threads.js')
    const t = createThread({ title: 'T', nextAction: 'N', state: 'active', owner: 'you' })
    createSession({ agent: 'claude_code', startedAt: new Date(), threadId: t.id })
    createSession({ agent: 'codex', startedAt: new Date() })
    expect(listSessions({ threadId: t.id })).toHaveLength(1)
  })

  it('respects the limit option', async () => {
    const { createSession, listSessions } = await setup()
    for (let i = 0; i < 5; i++) {
      createSession({ agent: 'manual', startedAt: new Date() })
    }
    expect(listSessions({ limit: 3 })).toHaveLength(3)
  })
})

describe('createSession with repo context fields', () => {
  it('persists folderName and githubUrl when provided', async () => {
    const { createSession, listSessions } = await setup()
    createSession({
      agent: 'claude_code',
      startedAt: new Date(),
      folderName: 'finnisher',
      githubUrl: 'https://github.com/mahpatil/finnisher',
    })
    const s = listSessions()[0]!
    expect(s.folderName).toBe('finnisher')
    expect(s.githubUrl).toBe('https://github.com/mahpatil/finnisher')
  })

  it('accepts null for both repo context fields', async () => {
    const { createSession, listSessions } = await setup()
    createSession({ agent: 'manual', startedAt: new Date(), folderName: null, githubUrl: null })
    const s = listSessions()[0]!
    expect(s.folderName).toBeNull()
    expect(s.githubUrl).toBeNull()
  })
})

describe('getOpenSessions', () => {
  it('returns only sessions where endedAt is null', async () => {
    const { createSession, closeSession, getOpenSessions } = await setup()
    const s1 = createSession({ agent: 'claude_code', startedAt: new Date() })
    createSession({ agent: 'codex', startedAt: new Date() })
    closeSession(s1.id, { endedAt: new Date() })
    const open = getOpenSessions()
    expect(open).toHaveLength(1)
    expect(open[0]!.agent).toBe('codex')
  })
})
