import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-codex-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  const dbPath = tempDbPath()
  process.env['FINNISHER_DB_PATH'] = dbPath
  vi.resetModules()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const sessions = await import('../../db/sessions.js')
  const handlers = await import('../codex.js')
  return { ...sessions, ...handlers, dbPath }
}

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
})

describe('handleCodexStart', () => {
  it('creates an open codex session', async () => {
    const { handleCodexStart, listSessions } = await setup()
    handleCodexStart()
    const all = listSessions()
    expect(all).toHaveLength(1)
    expect(all[0]!.agent).toBe('codex')
    expect(all[0]!.endedAt).toBeNull()
  })

  it('does not throw when called with no arguments', async () => {
    const { handleCodexStart } = await setup()
    expect(() => handleCodexStart()).not.toThrow()
  })

  it('stores the provided cwd as projectPath', async () => {
    const { handleCodexStart, listSessions } = await setup()
    handleCodexStart('/some/project')
    const s = listSessions()[0]!
    expect(s.projectPath).toBe('/some/project')
  })
})

describe('handleCodexStop', () => {
  it('closes the open codex session', async () => {
    const { handleCodexStart, handleCodexStop, listSessions } = await setup()
    handleCodexStart()
    handleCodexStop()
    const s = listSessions()[0]!
    expect(s.endedAt).not.toBeNull()
  })

  it('is silent and returns when no open codex session found', async () => {
    const { handleCodexStop, listSessions } = await setup()
    expect(() => handleCodexStop()).not.toThrow()
    expect(listSessions()).toHaveLength(0)
  })

  it('does not close a session for a different agent', async () => {
    const { handleCodexStop, createSession, listSessions } = await setup()
    createSession({ agent: 'claude_code', startedAt: new Date() })
    handleCodexStop()
    const s = listSessions()[0]!
    expect(s.endedAt).toBeNull()
  })
})
