import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { mkdirSync, writeFileSync, existsSync } from 'fs'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-opencode-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  const dbPath = tempDbPath()
  process.env['FINNISHER_DB_PATH'] = dbPath
  vi.resetModules()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const sessions = await import('../../db/sessions.js')
  const threads = await import('../../db/threads.js')
  const handlers = await import('../opencode.js')
  const common = await import('../common.js')
  return { ...sessions, ...threads, ...handlers, ...common, dbPath }
}

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
})

describe('handleOpencodeStart', () => {
  it('creates a new session with agent opencode', async () => {
    const { handleOpencodeStart, listSessions } = await setup()
    handleOpencodeStart(process.cwd())
    const sessions = listSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.agent).toBe('opencode')
  })

  it('creates session with threadId from .finn-thread', async () => {
    const { handleOpencodeStart, listSessions, createThread } = await setup()
    const dir = join(tmpdir(), 'finn-opencode-test-' + randomBytes(4).toString('hex'))
    mkdirSync(dir, { recursive: true })
    const thread = createThread({ title: 'Test', nextAction: 'N', state: 'active', owner: 'you' })
    writeFileSync(join(dir, '.finn-thread'), thread.id)
    handleOpencodeStart(dir)
    const sessions = listSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.threadId).toBe(thread.id)
  })

  it('creates session with projectPath set to cwd', async () => {
    const { handleOpencodeStart, listSessions } = await setup()
    const dir = join(tmpdir(), 'finn-opencode-test-' + randomBytes(4).toString('hex'))
    mkdirSync(dir, { recursive: true })
    handleOpencodeStart(dir)
    const sessions = listSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.projectPath).toBe(dir)
  })

  it('does not create duplicate session for same projectPath', async () => {
    const { handleOpencodeStart, listSessions } = await setup()
    handleOpencodeStart(process.cwd())
    handleOpencodeStart(process.cwd())
    const sessions = listSessions()
    expect(sessions).toHaveLength(1)
  })

  it('creates session without thread link when .finn-thread missing', async () => {
    const { handleOpencodeStart, listSessions } = await setup()
    handleOpencodeStart(process.cwd())
    const sessions = listSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.threadId).toBeNull()
  })
})

describe('handleOpencodeStop', () => {
  it('closes the open opencode session', async () => {
    const { handleOpencodeStop, createSession, listSessions } = await setup()
    createSession({ agent: 'opencode', startedAt: new Date() })
    handleOpencodeStop(JSON.stringify({ event: 'stop' }))
    const s = listSessions()[0]!
    expect(s.endedAt).not.toBeNull()
  })

  it('is silent and returns when no open opencode session found', async () => {
    const { handleOpencodeStop, listSessions } = await setup()
    expect(() => handleOpencodeStop(JSON.stringify({}))).not.toThrow()
    expect(listSessions()).toHaveLength(0)
  })

  it('is silent and returns when JSON is malformed', async () => {
    const { handleOpencodeStop, createSession, listSessions } = await setup()
    createSession({ agent: 'opencode', startedAt: new Date() })
    expect(() => handleOpencodeStop('bad json {')).not.toThrow()
    // Session remains open since stop didn't succeed
    const s = listSessions()[0]!
    expect(s.endedAt).toBeNull()
  })

  it('does not close a session for a different agent', async () => {
    const { handleOpencodeStop, createSession, listSessions } = await setup()
    createSession({ agent: 'codex', startedAt: new Date() })
    handleOpencodeStop(JSON.stringify({}))
    const s = listSessions()[0]!
    expect(s.endedAt).toBeNull()
  })

  it('uses cwd parameter for project path when provided', async () => {
    const { handleOpencodeStop, createSession, listSessions } = await setup()
    createSession({ agent: 'opencode', startedAt: new Date(), projectPath: '/other/path' })
    const dir = join(tmpdir(), 'finn-opencode-test-' + randomBytes(4).toString('hex'))
    mkdirSync(dir, { recursive: true })
    handleOpencodeStop(JSON.stringify({}), dir)
    const s = listSessions()[0]!
    expect(s.endedAt).not.toBeNull()
  })
})
