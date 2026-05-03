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
