import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { mkdirSync, writeFileSync } from 'fs'
import { Command } from 'commander'

function tempDir() {
  const d = join(tmpdir(), 'finnisher-discover-test-' + randomBytes(4).toString('hex'))
  mkdirSync(d, { recursive: true })
  return d
}

async function setup(home: string, workspaceRoot: string) {
  process.env['FINNISHER_DB_PATH'] = join(home, 'db.sqlite')
  process.env['FINN_WORKSPACE_ROOT'] = workspaceRoot
  vi.resetModules()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const { register } = await import('../commands/discover.js')
  const program = new Command().exitOverride()
  register(program)
  return { program }
}

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
  delete process.env['FINN_WORKSPACE_ROOT']
  delete process.env['FINNISHER_DB_PATH']
})

describe('finn discover — default mode', () => {
  it('completes without error on an empty workspace', async () => {
    const home = tempDir()
    const workspace = tempDir()
    const { program } = await setup(home, workspace)
    await expect(program.parseAsync(['node', 'finn', 'discover'])).resolves.not.toThrow()
  })

  it('completes without error when workspace has unlinked projects', async () => {
    const home = tempDir()
    const workspace = tempDir()
    mkdirSync(join(workspace, 'my-project'))
    const { program } = await setup(home, workspace)
    await expect(program.parseAsync(['node', 'finn', 'discover'])).resolves.not.toThrow()
  })

  it('detects project as linked when .finn-thread file is present', async () => {
    const home = tempDir()
    const workspace = tempDir()
    const projectDir = join(workspace, 'linked-project')
    mkdirSync(projectDir)
    writeFileSync(join(projectDir, '.finn-thread'), 'thread123ab\n')

    const messages: string[] = []
    vi.doMock('@clack/prompts', () => ({
      log: {
        message: (m: string) => messages.push(m ?? ''),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn(),
      },
      text: vi.fn().mockResolvedValue('Test Thread'),
      isCancel: vi.fn(() => false),
    }))

    const { program } = await setup(home, workspace)
    await program.parseAsync(['node', 'finn', 'discover'])
    const output = messages.join('\n')
    expect(output).toContain('Linked projects: 1')
    expect(output).toContain('Unlinked projects: 0')
  })

  it('detects project without .finn-thread as unlinked', async () => {
    const home = tempDir()
    const workspace = tempDir()
    mkdirSync(join(workspace, 'unlinked-project'))

    const messages: string[] = []
    vi.doMock('@clack/prompts', () => ({
      log: {
        message: (m: string) => messages.push(m ?? ''),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn(),
      },
      text: vi.fn().mockResolvedValue('Test Thread'),
      isCancel: vi.fn(() => false),
    }))

    const { program } = await setup(home, workspace)
    await program.parseAsync(['node', 'finn', 'discover'])
    const output = messages.join('\n')
    expect(output).toContain('Unlinked projects: 1')
    expect(output).toContain('Linked projects: 0')
  })
})

describe('finn discover --fix mode', () => {
  it('completes without error on an empty workspace', async () => {
    const home = tempDir()
    const workspace = tempDir()
    const { program } = await setup(home, workspace)
    await expect(program.parseAsync(['node', 'finn', 'discover', '--fix'])).resolves.not.toThrow()
  })

  it('warns when a project links to a non-existent thread', async () => {
    const home = tempDir()
    const workspace = tempDir()
    const projectDir = join(workspace, 'stale-project')
    mkdirSync(projectDir)
    writeFileSync(join(projectDir, '.finn-thread'), 'nonexistent1\n')

    const warnings: string[] = []
    vi.doMock('@clack/prompts', () => ({
      log: {
        message: vi.fn(),
        error: vi.fn(),
        warn: (m: string) => warnings.push(m ?? ''),
        success: vi.fn(),
      },
      text: vi.fn(),
      isCancel: vi.fn(() => false),
    }))

    const { program } = await setup(home, workspace)
    await program.parseAsync(['node', 'finn', 'discover', '--fix'])
    expect(warnings.some(w => w.includes('nonexistent1'))).toBe(true)
  })
})

describe('finn discover --create mode', () => {
  it('skips projects with no GitHub URL', async () => {
    const home = tempDir()
    const workspace = tempDir()
    mkdirSync(join(workspace, 'no-git-project'))

    const messages: string[] = []
    vi.doMock('@clack/prompts', () => ({
      log: {
        message: (m: string) => messages.push(m ?? ''),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn(),
      },
      text: vi.fn(),
      isCancel: vi.fn(() => false),
    }))

    const { program } = await setup(home, workspace)
    await program.parseAsync(['node', 'finn', 'discover', '--create'])
    expect(messages.some(m => m.includes('no GitHub URL'))).toBe(true)
  })

  it('completes without error when workspace is empty', async () => {
    const home = tempDir()
    const workspace = tempDir()
    const { program } = await setup(home, workspace)
    await expect(program.parseAsync(['node', 'finn', 'discover', '--create'])).resolves.not.toThrow()
  })
})
