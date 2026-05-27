import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finn-intent-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  vi.resetModules()
  const { runMigrations } = await import('../db/migrate.js')
  runMigrations()
  const { createSession, setSessionIntent } = await import('../db/sessions.js')
  const { createThread } = await import('../db/threads.js')
  return { createSession, setSessionIntent, createThread }
}

afterEach(async () => {
  const { _resetDb } = await import('../db/db.js')
  _resetDb()
  vi.resetModules()
  delete process.env['FINNISHER_DB_PATH']
})

describe('session intent schema', () => {
  it('sessions have an intent field defaulting to null', async () => {
    const { createSession } = await setup()
    const s = createSession({ agent: 'claude_code', startedAt: new Date() })
    expect(s).toHaveProperty('intent')
    expect(s.intent).toBeNull()
  })
})

describe('setSessionIntent', () => {
  it('saves intent text to the session', async () => {
    const { createSession, setSessionIntent } = await setup()
    const { getDb } = await import('../db/db.js')
    const { sessions } = await import('../db/schema.js')
    const { eq } = await import('drizzle-orm')
    const s = createSession({ agent: 'claude_code', startedAt: new Date() })
    setSessionIntent(s.id, 'Fix the login bug')
    const updated = getDb().select().from(sessions).where(eq(sessions.id, s.id)).get()!
    expect(updated.intent).toBe('Fix the login bug')
  })

  it('throws if session does not exist', async () => {
    const { setSessionIntent } = await setup()
    expect(() => setSessionIntent('nope', 'text')).toThrow()
  })
})
