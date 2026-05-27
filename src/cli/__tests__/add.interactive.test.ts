import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { Command } from 'commander'

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  text: vi.fn(),
  select: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
}))

function tempDbPath() {
  return join(tmpdir(), 'finn-add-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function makeStalled(db: Awaited<ReturnType<typeof setupProgram>>['db'], title: string) {
  const { getSqlite } = await import('../../db/db.js')
  const t = db.createThread({ title, nextAction: 'x', state: 'open', owner: 'you' })
  getSqlite().prepare('UPDATE threads SET updated_at = ? WHERE id = ?').run(Date.now() - 49 * 3600000, t.id)
  return t
}

async function setupProgram() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const { register: registerAdd } = await import('../commands/add.js')
  const program = new Command().name('finn').exitOverride().configureOutput({ writeErr: () => {} })
  registerAdd(program)
  const db = await import('../../db/threads.js')
  return { program, db }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  delete process.env['FINNISHER_DB_PATH']
  delete process.env['FINNISHER_HOME']
})

describe('finn add — stall interrupt (interactive)', () => {
  it('prompts with stall interrupt when 2+ stalled threads exist before asking for title', async () => {
    const { program, db } = await setupProgram()
    await makeStalled(db, 'Old Project A')
    await makeStalled(db, 'Old Project B')

    const p = await import('@clack/prompts')
    vi.mocked(p.select)
      .mockResolvedValueOnce('__proceed__')
      .mockResolvedValueOnce('you')
      .mockResolvedValueOnce('open')
    vi.mocked(p.text)
      .mockResolvedValueOnce('New Thread')
      .mockResolvedValueOnce('Start it')

    await program.parseAsync(['node', 'finn', 'add'])

    const calls = vi.mocked(p.select).mock.calls
    const firstSelectMsg = calls[0]?.[0]
    expect(firstSelectMsg).toBeDefined()
    expect(JSON.stringify(firstSelectMsg)).toContain('closer to done')
  })

  it('proceeds with add when user picks the proceed option', async () => {
    const { program, db } = await setupProgram()
    await makeStalled(db, 'Old A')
    await makeStalled(db, 'Old B')

    const p = await import('@clack/prompts')
    vi.mocked(p.select)
      .mockResolvedValueOnce('__proceed__')
      .mockResolvedValueOnce('you')
      .mockResolvedValueOnce('open')
    vi.mocked(p.text)
      .mockResolvedValueOnce('My New Thread')
      .mockResolvedValueOnce('Do the thing')

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'add'])

    const threads = db.listThreads()
    const newThread = threads.find(t => t.title === 'My New Thread')
    expect(newThread).toBeDefined()
    spy.mockRestore()
  })

  it('exits without creating a thread when user selects a stalled thread', async () => {
    const { program, db } = await setupProgram()
    const t1 = await makeStalled(db, 'Old A')
    await makeStalled(db, 'Old B')

    const p = await import('@clack/prompts')
    vi.mocked(p.select).mockResolvedValueOnce(t1.id)

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await program.parseAsync(['node', 'finn', 'add'])

    const threads = db.listThreads()
    expect(threads).toHaveLength(2)
    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('finn next')
    spy.mockRestore()
  })

  it('skips the stall interrupt when fewer than 2 threads are stalled', async () => {
    const { program, db } = await setupProgram()
    await makeStalled(db, 'Only One Stalled')

    const p = await import('@clack/prompts')
    vi.mocked(p.select)
      .mockResolvedValueOnce('you')
      .mockResolvedValueOnce('open')
    vi.mocked(p.text)
      .mockResolvedValueOnce('New Thread')
      .mockResolvedValueOnce('Do it')

    await program.parseAsync(['node', 'finn', 'add'])

    const calls = vi.mocked(p.select).mock.calls
    expect(JSON.stringify(calls[0])).not.toContain('closer to done')
  })
})
