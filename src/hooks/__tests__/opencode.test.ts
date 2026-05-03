import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

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
  const handlers = await import('../opencode.js')
  return { ...sessions, ...handlers, dbPath }
}

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
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
})
