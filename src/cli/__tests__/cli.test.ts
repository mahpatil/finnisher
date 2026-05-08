import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { Command } from 'commander'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-cli-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setupProgram() {
  const dbPath = tempDbPath()
  process.env['FINNISHER_DB_PATH'] = dbPath
  vi.resetModules()

  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()

  const { register: registerList } = await import('../commands/list.js')
  const { register: registerAdd } = await import('../commands/add.js')
  const { register: registerNext } = await import('../commands/next.js')
  const { register: registerDone } = await import('../commands/done.js')
  const { register: registerStatus } = await import('../commands/status.js')
  const { register: registerSessions } = await import('../commands/sessions.js')
  const { register: registerTouch } = await import('../commands/touch.js')
  const { register: registerWeb } = await import('../commands/web.js')

  const program = new Command()
    .name('finn')
    .exitOverride()
    .configureOutput({ writeErr: () => {} })

  registerList(program)
  registerAdd(program)
  registerNext(program)
  registerDone(program)
  registerStatus(program)
  registerSessions(program)
  registerTouch(program)
  registerWeb(program)

  const db = await import('../../db/threads.js')
  const sessionDb = await import('../../db/sessions.js')

  return { program, db, sessionDb, dbPath }
}

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
  vi.restoreAllMocks()
})

// ── finn list ──────────────────────────────────────────────────────────────

describe('finn list', () => {
  it('prints empty table with 0 stalled footer on empty DB', async () => {
    const { program } = await setupProgram()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('0 stalled')
  })

  it('shows thread with active badge after adding', async () => {
    const { program, db } = await setupProgram()
    db.createThread({ title: 'Ship MVP', nextAction: 'Write schema', state: 'active', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Ship MVP')
  })

  it('shows stalled badge for stalled threads', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'Old Thread', nextAction: 'Do it', state: 'active', owner: 'you' })
    const { getSqlite } = await import('../../db/db.js')
    getSqlite().prepare('UPDATE threads SET updated_at = ? WHERE id = ?').run(Date.now() - 49 * 60 * 60 * 1000, t.id)
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('STALLED')
  })

  it('filters by state when --state passed', async () => {
    const { program, db } = await setupProgram()
    db.createThread({ title: 'Active One', nextAction: 'x', state: 'active', owner: 'you' })
    db.createThread({ title: 'Waiting One', nextAction: 'x', state: 'waiting', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list', '--state', 'waiting'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Waiting One')
    expect(output).not.toContain('Active One')
  })

  it('hides done threads by default', async () => {
    const { program, db } = await setupProgram()
    db.createThread({ title: 'Done Thread', nextAction: 'x', state: 'done', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).not.toContain('Done Thread')
  })

  it('shows done threads with --state done', async () => {
    const { program, db } = await setupProgram()
    db.createThread({ title: 'Done Thread', nextAction: 'x', state: 'done', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list', '--state', 'done'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Done Thread')
  })

  it('shows focus warning banner for 6+ active threads', async () => {
    const { program, db } = await setupProgram()
    for (let i = 0; i < 6; i++) {
      db.createThread({ title: `Thread ${i}`, nextAction: 'x', state: 'active', owner: 'you' })
    }
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('6 active threads')
  })

  it('shows urgent red warning for 9+ active threads', async () => {
    const { program, db } = await setupProgram()
    for (let i = 0; i < 9; i++) {
      db.createThread({ title: `Thread ${i}`, nextAction: 'x', state: 'active', owner: 'you' })
    }
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('9 active threads')
  })
})

// ── finn add ───────────────────────────────────────────────────────────────

describe('finn add --title --next (non-interactive)', () => {
  it('creates a thread and prints the id', async () => {
    const { program, db } = await setupProgram()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'add', '--title', 'Ship MVP', '--next', 'Write schema'])
    const threads = db.listThreads()
    expect(threads).toHaveLength(1)
    expect(threads[0].title).toBe('Ship MVP')
    expect(threads[0].nextAction).toBe('Write schema')
    expect(threads[0].owner).toBe('you')
    expect(threads[0].state).toBe('active')
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain(threads[0].id)
  })

  it('prints focus warning when 6+ active threads after creation', async () => {
    const { program, db } = await setupProgram()
    for (let i = 0; i < 5; i++) {
      db.createThread({ title: `T${i}`, nextAction: 'x', state: 'active', owner: 'you' })
    }
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'add', '--title', '6th Thread', '--next', 'Start it'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('6 active threads')
  })

  it('no focus warning with 5 or fewer threads', async () => {
    const { program, db } = await setupProgram()
    for (let i = 0; i < 4; i++) {
      db.createThread({ title: `T${i}`, nextAction: 'x', state: 'active', owner: 'you' })
    }
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'add', '--title', '5th Thread', '--next', 'Start it'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).not.toContain('active threads — above')
  })
})

// ── finn next ──────────────────────────────────────────────────────────────

describe('finn next', () => {
  it('updates the next action and prints confirmation', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'old', state: 'active', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'next', t.id, 'new action'])
    expect(db.getThread(t.id)?.nextAction).toBe('new action')
    expect(spy.mock.calls.some(c => String(c[0]).includes('Next action updated'))).toBe(true)
  })

  it('exits with code 1 for nonexistent thread', async () => {
    const { program } = await setupProgram()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT') })
    try {
      await program.parseAsync(['node', 'finn', 'next', 'nonexistent', 'action'])
    } catch {
      // expected
    }
    expect(process.exitCode).toBe(1)
    exitSpy.mockRestore()
  })
})

// ── finn done ──────────────────────────────────────────────────────────────

describe('finn done', () => {
  it('marks thread done and prints time-to-completion', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'active', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'done', t.id])
    expect(db.getThread(t.id)?.state).toBe('done')
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Done.')
    expect(output).toContain('Completed in')
  })

  it('exits with code 1 for nonexistent thread', async () => {
    const { program } = await setupProgram()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT') })
    try {
      await program.parseAsync(['node', 'finn', 'done', 'nonexistent'])
    } catch {
      // expected
    }
    expect(process.exitCode).toBe(1)
    exitSpy.mockRestore()
  })

  it('drops from 6 to 5 threads and shows no focus warning', async () => {
    const { program, db } = await setupProgram()
    const threads = []
    for (let i = 0; i < 6; i++) {
      threads.push(db.createThread({ title: `T${i}`, nextAction: 'x', state: 'active', owner: 'you' }))
    }
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'done', threads[0].id])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).not.toContain('active threads — above')
  })
})

// ── finn status ────────────────────────────────────────────────────────────

describe('finn status', () => {
  it('transitions state and prints confirmation', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'active', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'status', t.id, 'waiting'])
    expect(db.getThread(t.id)?.state).toBe('waiting')
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('waiting')
  })

  it('exits with code 1 for nonexistent thread', async () => {
    const { program } = await setupProgram()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT') })
    try {
      await program.parseAsync(['node', 'finn', 'status', 'nonexistent', 'active'])
    } catch {
      // expected
    }
    expect(process.exitCode).toBe(1)
    exitSpy.mockRestore()
  })

  it('exits with code 1 for invalid state', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'active', owner: 'you' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT') })
    try {
      await program.parseAsync(['node', 'finn', 'status', t.id, 'invalid-state'])
    } catch {
      // expected
    }
    expect(process.exitCode).toBe(1)
    exitSpy.mockRestore()
  })

  it('prints focus warning when transitioning to active triggers overload', async () => {
    const { program, db } = await setupProgram()
    for (let i = 0; i < 5; i++) {
      db.createThread({ title: `T${i}`, nextAction: 'x', state: 'active', owner: 'you' })
    }
    const waiting = db.createThread({ title: 'Waiting', nextAction: 'x', state: 'waiting', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'status', waiting.id, 'active'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('6 active threads')
  })
})

// ── finn sessions ──────────────────────────────────────────────────────────

describe('finn sessions', () => {
  it('prints empty table on fresh DB', async () => {
    const { program } = await setupProgram()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'sessions'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Agent')
  })

  it('shows sessions with agent, duration, cost columns', async () => {
    const { program, sessionDb } = await setupProgram()
    const now = new Date()
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 14 * 60 * 1000)
    sessionDb.createSession({
      agent: 'claude_code',
      startedAt: now,
      endedAt: end,
      tokensIn: 1000,
      tokensOut: 500,
      costUsd: 0.12,
      gitBranch: 'main',
      lastCommitMsg: 'feat: initial',
      unpushedCount: 2,
      folderName: 'myproject',
      githubUrl: 'https://github.com/user/myproject',
    })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'sessions'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Claude')
    expect(output).toContain('$0.12')
    expect(output).toContain('myproject')
  })

  it('filters by --thread id', async () => {
    const { program, db, sessionDb } = await setupProgram()
    const t1 = db.createThread({ title: 'T1', nextAction: 'x', state: 'active', owner: 'you' })
    const t2 = db.createThread({ title: 'T2', nextAction: 'x', state: 'active', owner: 'you' })
    const now = new Date()
    sessionDb.createSession({ agent: 'claude_code', startedAt: now, threadId: t1.id })
    sessionDb.createSession({ agent: 'codex', startedAt: now, threadId: t2.id })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'sessions', '--thread', t1.id])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain(t1.id)
    expect(output).not.toContain('codex')
  })

  it('shows Folder and Repo columns', async () => {
    const { program, sessionDb } = await setupProgram()
    sessionDb.createSession({
      agent: 'manual',
      startedAt: new Date(),
      folderName: 'my-app',
      githubUrl: 'https://github.com/org/my-app',
    })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'sessions'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Folder')
    expect(output).toContain('Repo')
    expect(output).toContain('my-app')
  })

  it('shows em dash for null folderName and githubUrl', async () => {
    const { program, sessionDb } = await setupProgram()
    sessionDb.createSession({ agent: 'manual', startedAt: new Date() })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'sessions'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('—')
  })

  it('shows running for sessions without endedAt', async () => {
    const { program, sessionDb } = await setupProgram()
    sessionDb.createSession({ agent: 'claude_code', startedAt: new Date() })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'sessions'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('running')
  })
})

// ── finn touch ─────────────────────────────────────────────────────────────

describe('finn touch', () => {
  it('runs silently and exits 0 for a valid thread', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'active', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'touch', t.id])
    expect(spy).not.toHaveBeenCalled()
  })

  it('runs silently and exits 0 for nonexistent thread', async () => {
    const { program } = await setupProgram()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'touch', 'nonexistent-id'])
    expect(spy).not.toHaveBeenCalled()
    expect(errSpy).not.toHaveBeenCalled()
  })
})

// ── finn web ───────────────────────────────────────────────────────────────

describe('finn web', () => {
  it('registers web command without errors', async () => {
    const { program } = await setupProgram()
    const webCmd = program.commands.find(c => c.name() === 'web')
    expect(webCmd).toBeDefined()
    expect(webCmd?.description()).toContain('localhost:3141')
  })
})
