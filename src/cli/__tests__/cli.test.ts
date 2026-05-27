import { describe, it, expect, afterEach, vi } from 'vitest'
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
  const { register: registerArchive } = await import('../commands/archive.js')
  const { register: registerPriority } = await import('../commands/priority.js')
  const { register: registerLaunch } = await import('../commands/launch.js')

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
  registerArchive(program)
  registerPriority(program)
  registerLaunch(program)

  const db = await import('../../db/threads.js')
  const sessionDb = await import('../../db/sessions.js')
  const lcDb = await import('../../db/launchCriteria.js')

  return { program, db, sessionDb, lcDb, dbPath }
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

  it('shows thread title after adding', async () => {
    const { program, db } = await setupProgram()
    db.createThread({ title: 'Ship MVP', nextAction: 'Write schema', state: 'open', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Ship MVP')
  })

  it('shows stalled badge for stalled threads', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'Old Thread', nextAction: 'Do it', state: 'open', owner: 'you' })
    const { getSqlite } = await import('../../db/db.js')
    getSqlite().prepare('UPDATE threads SET updated_at = ? WHERE id = ?').run(Date.now() - 49 * 60 * 60 * 1000, t.id)
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('STALLED')
  })

  it('filters by state when --state passed', async () => {
    const { program, db } = await setupProgram()
    db.createThread({ title: 'Open One', nextAction: 'x', state: 'open', owner: 'you' })
    db.createThread({ title: 'Waiting One', nextAction: 'x', state: 'waiting', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list', '--state', 'waiting'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Waiting One')
    expect(output).not.toContain('Open One')
  })

  it('hides archived threads by default', async () => {
    const { program, db } = await setupProgram()
    db.createThread({ title: 'Archived Thread', nextAction: 'x', state: 'archived', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).not.toContain('Archived Thread')
  })

  it('shows archived threads with --archived', async () => {
    const { program, db } = await setupProgram()
    db.createThread({ title: 'Archived Thread', nextAction: 'x', state: 'archived', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list', '--archived'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Archived Thread')
  })

  it('shows focus warning banner for 6+ open threads', async () => {
    const { program, db } = await setupProgram()
    for (let i = 0; i < 6; i++) {
      db.createThread({ title: `Thread ${i}`, nextAction: 'x', state: 'open', owner: 'you' })
    }
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('6 active threads')
  })

  it('shows urgent red warning for 9+ open threads', async () => {
    const { program, db } = await setupProgram()
    for (let i = 0; i < 9; i++) {
      db.createThread({ title: `Thread ${i}`, nextAction: 'x', state: 'open', owner: 'you' })
    }
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('9 active threads')
  })
})

// ── finn add ───────────────────────────────────────────────────────────────

describe('finn add --title --next (non-interactive)', () => {
  it('creates a thread with open state and prints the id', async () => {
    const { program, db } = await setupProgram()
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'add', '--title', 'Ship MVP', '--next', 'Write schema'])
    const threads = db.listThreads()
    expect(threads).toHaveLength(1)
    expect(threads[0].title).toBe('Ship MVP')
    expect(threads[0].nextAction).toBe('Write schema')
    expect(threads[0].owner).toBe('you')
    expect(threads[0].state).toBe('open')
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain(threads[0].id)
  })

  it('prints focus warning when 6+ open threads after creation', async () => {
    const { program, db } = await setupProgram()
    for (let i = 0; i < 5; i++) {
      db.createThread({ title: `T${i}`, nextAction: 'x', state: 'open', owner: 'you' })
    }
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'add', '--title', '6th Thread', '--next', 'Start it'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('6 active threads')
  })

  it('no focus warning with 5 or fewer threads', async () => {
    const { program, db } = await setupProgram()
    for (let i = 0; i < 4; i++) {
      db.createThread({ title: `T${i}`, nextAction: 'x', state: 'open', owner: 'you' })
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
    const t = db.createThread({ title: 'T', nextAction: 'old', state: 'open', owner: 'you' })
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
  it('marks thread closed and prints time-to-completion', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'done', t.id])
    expect(db.getThread(t.id)?.state).toBe('closed')
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
      threads.push(db.createThread({ title: `T${i}`, nextAction: 'x', state: 'open', owner: 'you' }))
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
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
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
      await program.parseAsync(['node', 'finn', 'status', 'nonexistent', 'open'])
    } catch {
      // expected
    }
    expect(process.exitCode).toBe(1)
    exitSpy.mockRestore()
  })

  it('exits with code 1 for invalid state', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
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

  it('rejects legacy state vocabulary', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT') })
    for (const legacyState of ['active', 'done']) {
      try {
        await program.parseAsync(['node', 'finn', 'status', t.id, legacyState])
      } catch {
        // expected
      }
      expect(process.exitCode).toBe(1)
      process.exitCode = 0
    }
    exitSpy.mockRestore()
  })

  it('prints focus warning when transitioning to open triggers overload', async () => {
    const { program, db } = await setupProgram()
    for (let i = 0; i < 5; i++) {
      db.createThread({ title: `T${i}`, nextAction: 'x', state: 'open', owner: 'you' })
    }
    const waiting = db.createThread({ title: 'Waiting', nextAction: 'x', state: 'waiting', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'status', waiting.id, 'open'])
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
    const t1 = db.createThread({ title: 'T1', nextAction: 'x', state: 'open', owner: 'you' })
    const t2 = db.createThread({ title: 'T2', nextAction: 'x', state: 'open', owner: 'you' })
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
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
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

// ── finn archive / unarchive ──────────────────────────────────────────────

describe('finn archive', () => {
  it('sets state to archived and prints confirmation', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'archive', t.id])
    expect(db.getThread(t.id)?.state).toBe('archived')
    expect(spy.mock.calls.some(c => String(c[0]).includes('archived'))).toBe(true)
  })

  it('works on waiting and blocked threads', async () => {
    const { program, db } = await setupProgram()
    const w = db.createThread({ title: 'W', nextAction: 'N', state: 'waiting', owner: 'you' })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'archive', w.id])
    expect(db.getThread(w.id)?.state).toBe('archived')
  })

  it('prints already-archived message when thread is already archived', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'archived', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'archive', t.id])
    expect(spy.mock.calls.some(c => String(c[0]).includes('already archived'))).toBe(true)
  })

  it('exits with code 1 for nonexistent thread', async () => {
    const { program } = await setupProgram()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT') })
    try {
      await program.parseAsync(['node', 'finn', 'archive', 'nonexistent'])
    } catch { /* expected */ }
    expect(process.exitCode).toBe(1)
    exitSpy.mockRestore()
  })
})

describe('finn unarchive', () => {
  it('sets state to open and prints confirmation', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'archived', owner: 'you' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'unarchive', t.id])
    expect(db.getThread(t.id)?.state).toBe('open')
    expect(spy.mock.calls.some(c => String(c[0]).includes('unarchived'))).toBe(true)
  })

  it('exits with code 1 when thread is not archived', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT') })
    try {
      await program.parseAsync(['node', 'finn', 'unarchive', t.id])
    } catch { /* expected */ }
    expect(process.exitCode).toBe(1)
    exitSpy.mockRestore()
  })
})

// ── finn priority ─────────────────────────────────────────────────────────

describe('finn priority', () => {
  it('sets priority and prints confirmation', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    expect(db.getThread(t.id)?.priority).toBe('later')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'priority', t.id, 'now'])
    expect(db.getThread(t.id)?.priority).toBe('now')
    expect(spy.mock.calls.some(c => String(c[0]).includes('now'))).toBe(true)
  })

  it('exits with code 1 for invalid priority', async () => {
    const { program, db } = await setupProgram()
    const t = db.createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT') })
    try {
      await program.parseAsync(['node', 'finn', 'priority', t.id, 'critical'])
    } catch { /* expected */ }
    expect(process.exitCode).toBe(1)
    exitSpy.mockRestore()
  })

  it('exits with code 1 for nonexistent thread', async () => {
    const { program } = await setupProgram()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT') })
    try {
      await program.parseAsync(['node', 'finn', 'priority', 'nonexistent', 'now'])
    } catch { /* expected */ }
    expect(process.exitCode).toBe(1)
    exitSpy.mockRestore()
  })
})

// ── finn list --priority / --archived ─────────────────────────────────────

describe('finn list --priority', () => {
  it('filters to only now-priority threads', async () => {
    const { program, db } = await setupProgram()
    db.createThread({ title: 'Now One', nextAction: 'x', state: 'open', owner: 'you', priority: 'now' })
    db.createThread({ title: 'Later One', nextAction: 'x', state: 'open', owner: 'you', priority: 'later' })
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list', '--priority', 'now'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Now One')
    expect(output).not.toContain('Later One')
  })

  it('exits with code 1 for invalid priority', async () => {
    const { program } = await setupProgram()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('EXIT') })
    try {
      await program.parseAsync(['node', 'finn', 'list', '--priority', 'critical'])
    } catch { /* expected */ }
    expect(process.exitCode).toBe(1)
    exitSpy.mockRestore()
  })
})

// ── finn list — launch gate badge ──────────────────────────────────────────

describe('finn list — [READY] badge', () => {
  it('shows [READY] badge when all launch criteria are checked', async () => {
    const { program, db, lcDb } = await setupProgram()
    const t = db.createThread({ title: 'Ready Project', nextAction: 'Ship', state: 'open', owner: 'you' })
    const c1 = lcDb.addLaunchCriterion(t.id, 'Deployed to prod')
    const c2 = lcDb.addLaunchCriterion(t.id, 'Announced publicly')
    lcDb.toggleLaunchCriterion(c1.id, true)
    lcDb.toggleLaunchCriterion(c2.id, true)
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('[READY]')
  })

  it('does not show [READY] badge when criteria are partially checked', async () => {
    const { program, db, lcDb } = await setupProgram()
    const t = db.createThread({ title: 'Partial Project', nextAction: 'Work', state: 'open', owner: 'you' })
    const c = lcDb.addLaunchCriterion(t.id, 'Deployed to prod')
    lcDb.addLaunchCriterion(t.id, 'Announced')
    lcDb.toggleLaunchCriterion(c.id, true)
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'list'])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).not.toContain('[READY]')
  })
})

// ── finn done — launch gate warning ────────────────────────────────────────

describe('finn done — launch gate warning', () => {
  it('warns when criteria exist but are not all checked', async () => {
    const { program, db, lcDb } = await setupProgram()
    const t = db.createThread({ title: 'Unfinished', nextAction: 'Ship', state: 'open', owner: 'you' })
    lcDb.addLaunchCriterion(t.id, 'Deployed to prod')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'done', t.id])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Launch gate incomplete')
    expect(db.getThread(t.id)?.state).toBe('closed')
  })

  it('does not warn when all criteria are checked', async () => {
    const { program, db, lcDb } = await setupProgram()
    const t = db.createThread({ title: 'Finished', nextAction: 'Ship', state: 'open', owner: 'you' })
    const c = lcDb.addLaunchCriterion(t.id, 'Deployed to prod')
    lcDb.toggleLaunchCriterion(c.id, true)
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'done', t.id])
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).not.toContain('Launch gate incomplete')
  })
})
