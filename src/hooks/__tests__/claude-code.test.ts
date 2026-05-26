import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-hook-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  const dbPath = tempDbPath()
  process.env['FINNISHER_DB_PATH'] = dbPath
  vi.resetModules()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const sessions = await import('../../db/sessions.js')
  const handlers = await import('../claude-code.js')
  return { ...sessions, ...handlers, dbPath }
}

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
})

describe('handleClaudeStart', () => {
  it('creates an open claude_code session', async () => {
    const { handleClaudeStart, listSessions } = await setup()
    handleClaudeStart({})
    const all = listSessions()
    expect(all).toHaveLength(1)
    expect(all[0]!.agent).toBe('claude_code')
    expect(all[0]!.endedAt).toBeNull()
  })

  it('does not throw when called with null payload', async () => {
    const { handleClaudeStart } = await setup()
    expect(() => handleClaudeStart(null)).not.toThrow()
  })

  it('stores projectPath from CLAUDE_PROJECT_DIR env var', async () => {
    const { handleClaudeStart, listSessions } = await setup()
    process.env['CLAUDE_PROJECT_DIR'] = '/fake/project/path'
    handleClaudeStart({})
    delete process.env['CLAUDE_PROJECT_DIR']
    const s = listSessions()[0]!
    expect(s.projectPath).toBe('/fake/project/path')
  })

  it('deduplicates same-day sessions without creating a duplicate', async () => {
    const { handleClaudeStart, listSessions } = await setup()
    handleClaudeStart({}, '/test/project')
    handleClaudeStart({}, '/test/project')
    expect(listSessions()).toHaveLength(1)
  })

  it('auto-closes a stale open session and creates a fresh one', async () => {
    const { handleClaudeStart, createSession, listSessions } = await setup()
    // Create a stale session (25 hours ago)
    createSession({
      agent: 'claude_code',
      startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      projectPath: '/test/stale',
      folderName: 'stale',
      threadId: null,
      githubUrl: null,
    })
    handleClaudeStart({}, '/test/stale')
    const all = listSessions()
    expect(all).toHaveLength(2)
    const stale = all.find(s => s.startedAt.getTime() < Date.now() - 20 * 60 * 60 * 1000)!
    expect(stale.endedAt).not.toBeNull()
    const fresh = all.find(s => s.endedAt === null)!
    expect(fresh).toBeDefined()
    expect(fresh.projectPath).toBe('/test/stale')
  })

  it('backfills thread_id for same-projectPath sessions that had null threadId', async () => {
    const dbPath = tempDbPath()
    process.env['FINNISHER_DB_PATH'] = dbPath
    vi.resetModules()
    const { runMigrations } = await import('../../db/migrate.js')
    runMigrations()
    const sessions = await import('../../db/sessions.js')
    const threads = await import('../../db/threads.js')

    const t = threads.createThread({ title: 'Proj', nextAction: 'A', state: 'open', owner: 'you' })
    const orphan = sessions.createSession({
      agent: 'claude_code',
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      projectPath: '/test/proj',
      folderName: 'proj',
      threadId: null,
      githubUrl: null,
    })
    // Close orphan so dedup won't return early
    sessions.closeSession(orphan.id, { endedAt: new Date() })

    // Backfill directly
    sessions.backfillNullThreadSessions('/test/proj', t.id)

    const updated = sessions.listSessions().find(s => s.id === orphan.id)!
    expect(updated.threadId).toBe(t.id)
  })
})

describe('handleClaudeStop', () => {
  it('parses JSON and closes the open session with token fields', async () => {
    const { handleClaudeStart, handleClaudeStop, listSessions } = await setup()
    handleClaudeStart({})
    const raw = JSON.stringify({
      totalCostUSD: 0.05,
      usage: { input_tokens: 1000, output_tokens: 200 },
      session_id: 'abc123',
    })
    handleClaudeStop(raw)
    const s = listSessions()[0]!
    expect(s.endedAt).not.toBeNull()
    expect(s.tokensIn).toBe(1000)
    expect(s.tokensOut).toBe(200)
    expect(s.costUsd).toBeCloseTo(0.05)
  })

  it('is silent and returns when no open session found', async () => {
    const { handleClaudeStop, listSessions } = await setup()
    const raw = JSON.stringify({ totalCostUSD: 0.01, usage: { input_tokens: 10, output_tokens: 5 } })
    expect(() => handleClaudeStop(raw)).not.toThrow()
    expect(listSessions()).toHaveLength(0)
  })

  it('is silent and returns when JSON is malformed', async () => {
    const { handleClaudeStart, handleClaudeStop, listSessions } = await setup()
    handleClaudeStart({})
    expect(() => handleClaudeStop('not valid json {')).not.toThrow()
    // Session should remain open since stop didn't succeed
    const s = listSessions()[0]!
    expect(s.endedAt).toBeNull()
  })

  it('handles missing usage fields gracefully', async () => {
    const { handleClaudeStart, handleClaudeStop, listSessions } = await setup()
    handleClaudeStart({})
    handleClaudeStop(JSON.stringify({ totalCostUSD: 0.02 }))
    const s = listSessions()[0]!
    expect(s.endedAt).not.toBeNull()
    expect(s.tokensIn).toBeNull()
    expect(s.tokensOut).toBeNull()
    expect(s.costUsd).toBeCloseTo(0.02)
  })
})
