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
  multiselect: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
  log: { info: vi.fn(), warn: vi.fn() },
}))

function tempDbPath() {
  return join(tmpdir(), 'finn-launch-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setupProgram() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const { createThread } = await import('../../db/threads.js')
  const thread = createThread({ title: 'My Project', nextAction: 'Ship it', state: 'open', owner: 'you' })
  const { register } = await import('../commands/launch.js')
  const program = new Command().name('finn').exitOverride().configureOutput({ writeErr: () => {} })
  register(program)
  const lc = await import('../../db/launchCriteria.js')
  return { program, thread, lc }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  delete process.env['FINNISHER_DB_PATH']
})

describe('finn launch <id>', () => {
  it('prompts to add criteria when none exist and saves them', async () => {
    const { program, thread, lc } = await setupProgram()
    const p = await import('@clack/prompts')
    vi.mocked(p.text)
      .mockResolvedValueOnce('Deployed to prod')
      .mockResolvedValueOnce('')
    vi.spyOn(console, 'log').mockImplementation(() => {})

    await program.parseAsync(['node', 'finn', 'launch', thread.id])

    const criteria = lc.getLaunchCriteria(thread.id)
    expect(criteria).toHaveLength(1)
    expect(criteria[0].text).toBe('Deployed to prod')
  })

  it('shows existing criteria when some are already set', async () => {
    const { program, thread, lc } = await setupProgram()
    lc.addLaunchCriterion(thread.id, 'Deployed to prod')

    const p = await import('@clack/prompts')
    vi.mocked(p.text).mockResolvedValueOnce('')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await program.parseAsync(['node', 'finn', 'launch', thread.id])

    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('Deployed to prod')
  })

  it('toggles a criterion checked with --check flag', async () => {
    const { program, thread, lc } = await setupProgram()
    const c = lc.addLaunchCriterion(thread.id, 'First gate')
    vi.spyOn(console, 'log').mockImplementation(() => {})

    await program.parseAsync(['node', 'finn', 'launch', thread.id, '--check', '1'])

    const [updated] = lc.getLaunchCriteria(thread.id)
    expect(updated.id).toBe(c.id)
    expect(updated.checked).toBe(true)
  })

  it('prints error when thread does not exist', async () => {
    const { program } = await setupProgram()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await program.parseAsync(['node', 'finn', 'launch', 'no-such-id'])

    const output = spy.mock.calls.map(c => c[0] as string).join('\n')
    expect(output).toContain('not found')
  })
})
