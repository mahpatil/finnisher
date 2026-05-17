import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { writeFileSync, mkdirSync, rmSync } from 'fs'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-gemini-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

function tempDir() {
  const dir = join(tmpdir(), 'finnisher-gemini-test-' + randomBytes(4).toString('hex'))
  mkdirSync(dir, { recursive: true })
  return dir
}

async function setup() {
  const dbPath = tempDbPath()
  process.env['FINNISHER_DB_PATH'] = dbPath
  vi.resetModules()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const sessions = await import('../../db/sessions.js')
  const threads = await import('../../db/threads.js')
  const handlers = await import('../gemini.js')
  return { ...sessions, ...threads, ...handlers, dbPath }
}

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
  delete process.env['FINNISHER_DB_PATH']
  delete process.env['GEMINI_PROJECT_DIR']
})

describe('handleGeminiStart', () => {
  it('creates an open gemini_code session', async () => {
    const { handleGeminiStart, listSessions } = await setup()
    handleGeminiStart(undefined, '/test/project')
    const all = listSessions()
    expect(all).toHaveLength(1)
    expect(all[0]!.agent).toBe('gemini_code')
    expect(all[0]!.endedAt).toBeNull()
    expect(all[0]!.projectPath).toBe('/test/project')
  })

  it('does not throw on any error', async () => {
    const { handleGeminiStart } = await setup()
    expect(() => handleGeminiStart(undefined, '/test/project')).not.toThrow()
  })

  it('does not create duplicate sessions for same project', async () => {
    const { handleGeminiStart, listSessions } = await setup()
    handleGeminiStart(undefined, '/test/project')
    handleGeminiStart(undefined, '/test/project')
    const all = listSessions()
    expect(all).toHaveLength(1)
  })

  it('reads thread ID from .finn-thread file', async () => {
    const { handleGeminiStart, listSessions, createThread } = await setup()
    // Create a thread first (required for foreign key constraint)
    const thread = createThread({ title: 'Test thread', nextAction: 'Test action' })
    const projectDir = tempDir()
    writeFileSync(join(projectDir, '.finn-thread'), thread.id)
    handleGeminiStart(undefined, projectDir)
    const all = listSessions()
    const s = all[0]!
    expect(s.threadId).toBe(thread.id)
    rmSync(projectDir, { recursive: true, force: true })
  })

  it('creates session with not null threadId (auto-created) when .finn-thread missing', async () => {
    const { handleGeminiStart, listSessions } = await setup()
    handleGeminiStart(undefined, '/test/project')
    const s = listSessions()[0]!
    expect(s.threadId).not.toBeNull()
  })

  it('captures folderName from project path', async () => {
    const { handleGeminiStart, listSessions } = await setup()
    handleGeminiStart(undefined, '/home/user/my-project')
    const s = listSessions()[0]!
    expect(s.folderName).toBe('my-project')
  })
})

describe('handleGeminiStop', () => {
  it('closes the open gemini_code session', async () => {
    const { handleGeminiStart, handleGeminiStop, listSessions } = await setup()
    handleGeminiStart(undefined, '/test/project')
    handleGeminiStop('{}', '/test/project')
    const s = listSessions()[0]!
    expect(s.endedAt).not.toBeNull()
  })

  it('parses token and cost data from JSON payload', async () => {
    const { handleGeminiStart, handleGeminiStop, listSessions } = await setup()
    handleGeminiStart(undefined, '/test/project')
    const raw = JSON.stringify({
      totalCostUSD: 0.03,
      tokensIn: 1500,
      tokensOut: 300,
    })
    handleGeminiStop(raw, '/test/project')
    const s = listSessions()[0]!
    expect(s.endedAt).not.toBeNull()
    expect(s.tokensIn).toBe(1500)
    expect(s.tokensOut).toBe(300)
    expect(s.costUsd).toBeCloseTo(0.03)
  })

  it('is silent and returns when no open session found', async () => {
    const { handleGeminiStop, listSessions } = await setup()
    const raw = JSON.stringify({ totalCostUSD: 0.01 })
    expect(() => handleGeminiStop(raw, '/test/project')).not.toThrow()
    expect(listSessions()).toHaveLength(0)
  })

  it('is silent and returns when JSON is malformed', async () => {
    const { handleGeminiStart, handleGeminiStop, listSessions } = await setup()
    handleGeminiStart(undefined, '/test/project')
    expect(() => handleGeminiStop('not valid json {', '/test/project')).not.toThrow()
    // Session should remain open since stop didn't succeed
    const s = listSessions()[0]!
    expect(s.endedAt).toBeNull()
  })

  it('handles missing token/cost fields gracefully', async () => {
    const { handleGeminiStart, handleGeminiStop, listSessions } = await setup()
    handleGeminiStart(undefined, '/test/project')
    handleGeminiStop(JSON.stringify({}), '/test/project')
    const s = listSessions()[0]!
    expect(s.endedAt).not.toBeNull()
    expect(s.tokensIn).toBeNull()
    expect(s.tokensOut).toBeNull()
    expect(s.costUsd).toBeNull()
  })

  it('does not throw on any error', async () => {
    const { handleGeminiStop } = await setup()
    expect(() => handleGeminiStop('{}', '/test/project')).not.toThrow()
  })
})
