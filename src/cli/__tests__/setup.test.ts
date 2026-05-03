import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { Command } from 'commander'

function tempDir() {
  const d = join(tmpdir(), 'finnisher-setup-test-' + randomBytes(4).toString('hex'))
  mkdirSync(d, { recursive: true })
  return d
}

async function setup(finnisherHome: string) {
  process.env['FINNISHER_DB_PATH'] = join(finnisherHome, 'db.sqlite')
  vi.resetModules()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const { register } = await import('../commands/setup.js')
  const program = new Command().exitOverride()
  register(program)
  return { program }
}

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
})

describe('finn setup — DB init', () => {
  it('creates the finnisher home dir and db file when they do not exist', async () => {
    const home = tempDir()
    const dbPath = join(home, 'nested', 'db.sqlite')
    process.env['FINNISHER_DB_PATH'] = dbPath
    vi.resetModules()
    const { register } = await import('../commands/setup.js')
    const program = new Command().exitOverride()
    register(program)
    await program.parseAsync(['node', 'finn', 'setup'])
    expect(existsSync(dbPath)).toBe(true)
  })
})

describe('finn setup — ~/.claude/settings.json hooks', () => {
  it('writes PostToolUse and Stop hook entries without destroying existing config', async () => {
    const home = tempDir()
    const claudeDir = join(home, '.claude')
    mkdirSync(claudeDir, { recursive: true })
    const settingsPath = join(claudeDir, 'settings.json')
    writeFileSync(settingsPath, JSON.stringify({ theme: 'dark', hooks: { OtherHook: ['existing'] } }))

    const { program } = await setup(home)
    await program.parseAsync(['node', 'finn', 'setup', '--claude-settings', settingsPath])

    const config = JSON.parse(readFileSync(settingsPath, 'utf8'))
    expect(config.theme).toBe('dark')
    expect(config.hooks.OtherHook).toEqual(['existing'])
    expect(config.hooks.PostToolUse).toBeDefined()
    expect(config.hooks.Stop).toBeDefined()
  })

  it('does not duplicate hook entries when run twice', async () => {
    const home = tempDir()
    const claudeDir = join(home, '.claude')
    mkdirSync(claudeDir, { recursive: true })
    const settingsPath = join(claudeDir, 'settings.json')
    writeFileSync(settingsPath, JSON.stringify({}))

    const { program } = await setup(home)
    await program.parseAsync(['node', 'finn', 'setup', '--claude-settings', settingsPath])
    await program.parseAsync(['node', 'finn', 'setup', '--claude-settings', settingsPath])

    const config = JSON.parse(readFileSync(settingsPath, 'utf8'))
    expect(config.hooks.PostToolUse).toHaveLength(1)
    expect(config.hooks.Stop).toHaveLength(1)
  })

  it('handles invalid JSON in existing settings.json by starting fresh', async () => {
    const home = tempDir()
    const claudeDir = join(home, '.claude')
    mkdirSync(claudeDir, { recursive: true })
    const settingsPath = join(claudeDir, 'settings.json')
    writeFileSync(settingsPath, 'not-valid-json')

    const { program } = await setup(home)
    await expect(
      program.parseAsync(['node', 'finn', 'setup', '--claude-settings', settingsPath]),
    ).resolves.not.toThrow()

    const config = JSON.parse(readFileSync(settingsPath, 'utf8'))
    expect(config.hooks).toBeDefined()
  })
})

describe('finn setup --git', () => {
  it('writes post-commit hook to .git/hooks/', async () => {
    const home = tempDir()
    const gitHooksDir = join(home, '.git', 'hooks')
    mkdirSync(gitHooksDir, { recursive: true })

    const { program } = await setup(home)
    await program.parseAsync(['node', 'finn', 'setup', '--git', '--git-dir', home])

    const hookPath = join(gitHooksDir, 'post-commit')
    expect(existsSync(hookPath)).toBe(true)
    const content = readFileSync(hookPath, 'utf8')
    expect(content).toContain('finn hook git-post-commit')
  })

  it('appends finn line when post-commit already exists without duplicating', async () => {
    const home = tempDir()
    const gitHooksDir = join(home, '.git', 'hooks')
    mkdirSync(gitHooksDir, { recursive: true })
    const hookPath = join(gitHooksDir, 'post-commit')
    writeFileSync(hookPath, '#!/bin/bash\necho "existing hook"\n')

    const { program } = await setup(home)
    await program.parseAsync(['node', 'finn', 'setup', '--git', '--git-dir', home])
    await program.parseAsync(['node', 'finn', 'setup', '--git', '--git-dir', home])

    const content = readFileSync(hookPath, 'utf8')
    expect(content).toContain('existing hook')
    expect(content.match(/finn hook git-post-commit/g)).toHaveLength(1)
  })
})

describe('finn setup — no agents detected', () => {
  it('completes successfully even when no agents are found', async () => {
    const home = tempDir()
    const { program } = await setup(home)
    await expect(
      program.parseAsync(['node', 'finn', 'setup', '--no-auto-detect']),
    ).resolves.not.toThrow()
  })
})
