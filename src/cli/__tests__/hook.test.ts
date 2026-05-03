import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { mkdirSync, writeFileSync } from 'fs'
import { Command } from 'commander'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-hook-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  const dbPath = tempDbPath()
  process.env['FINNISHER_DB_PATH'] = dbPath
  vi.resetModules()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const { register } = await import('../commands/hook.js')
  const sessions = await import('../../db/sessions.js')
  const threads = await import('../../db/threads.js')
  const program = new Command().exitOverride()
  register(program)
  return { program, sessions, threads, dbPath }
}

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
})

describe('finn hook git-post-commit', () => {
  it('touches the thread from .finn-thread in cwd', async () => {
    const { program, threads } = await setup()
    const t = threads.createThread({ title: 'T', nextAction: 'N', state: 'active', owner: 'you' })
    const before = t.updatedAt.getTime()

    const dir = join(tmpdir(), 'finn-hook-test-' + randomBytes(4).toString('hex'))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, '.finn-thread'), t.id)

    await new Promise(r => setTimeout(r, 5))
    await program.parseAsync(['node', 'finn', 'hook', 'git-post-commit', '--cwd', dir])

    const after = threads.getThread(t.id)!
    expect(after.updatedAt.getTime()).toBeGreaterThan(before)
  })

  it('exits 0 silently when no .finn-thread in cwd', async () => {
    const { program } = await setup()
    const dir = join(tmpdir(), 'finn-hook-test-' + randomBytes(4).toString('hex'))
    mkdirSync(dir, { recursive: true })
    await expect(
      program.parseAsync(['node', 'finn', 'hook', 'git-post-commit', '--cwd', dir]),
    ).resolves.not.toThrow()
  })
})

describe('finn hook claude-stop', () => {
  it('closes an open claude_code session with token data from stdin', async () => {
    const { program, sessions } = await setup()

    const s = sessions.createSession({ agent: 'claude_code', startedAt: new Date() })
    expect(s.endedAt).toBeNull()

    const payload = JSON.stringify({ totalCostUSD: 0.05, tokensIn: 1000, tokensOut: 200 })
    await program.parseAsync(['node', 'finn', 'hook', 'claude-stop', '--stdin', payload])

    const closed = sessions.listSessions()[0]!
    expect(closed.endedAt).not.toBeNull()
    expect(closed.costUsd).toBeCloseTo(0.05)
    expect(closed.tokensIn).toBe(1000)
    expect(closed.tokensOut).toBe(200)
  })

  it('exits 0 with no open session', async () => {
    const { program } = await setup()
    const payload = JSON.stringify({ totalCostUSD: 0.01, tokensIn: 100, tokensOut: 10 })
    await expect(
      program.parseAsync(['node', 'finn', 'hook', 'claude-stop', '--stdin', payload]),
    ).resolves.not.toThrow()
  })

  it('exits 0 with malformed JSON stdin', async () => {
    const { program } = await setup()
    await expect(
      program.parseAsync(['node', 'finn', 'hook', 'claude-stop', '--stdin', 'not-json']),
    ).resolves.not.toThrow()
  })
})

describe('finn hook claude-pre-tool-use', () => {
  it('creates an open claude_code session', async () => {
    const { program, sessions } = await setup()
    await program.parseAsync(['node', 'finn', 'hook', 'claude-pre-tool-use'])
    expect(sessions.getOpenSessions().filter(s => s.agent === 'claude_code')).toHaveLength(1)
  })

  it('does not create a duplicate session when one is already open', async () => {
    const { program, sessions } = await setup()
    await program.parseAsync(['node', 'finn', 'hook', 'claude-pre-tool-use'])
    await program.parseAsync(['node', 'finn', 'hook', 'claude-pre-tool-use'])
    expect(sessions.getOpenSessions().filter(s => s.agent === 'claude_code')).toHaveLength(1)
  })
})
