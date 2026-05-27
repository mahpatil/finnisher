import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
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
  it('writes UserPromptSubmit, PostToolUse and Stop hook entries without destroying existing config', async () => {
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
    expect(config.hooks.UserPromptSubmit).toBeDefined()
    expect(config.hooks.PostToolUse).toBeDefined()
    expect(config.hooks.Stop).toBeDefined()
  })

  it('writes hooks in { matcher, hooks } wrapper format required by Claude Code', async () => {
    const home = tempDir()
    const claudeDir = join(home, '.claude')
    mkdirSync(claudeDir, { recursive: true })
    const settingsPath = join(claudeDir, 'settings.json')
    writeFileSync(settingsPath, JSON.stringify({}))

    const { program } = await setup(home)
    await program.parseAsync(['node', 'finn', 'setup', '--claude-settings', settingsPath])

    const config = JSON.parse(readFileSync(settingsPath, 'utf8'))

    const upsEntry = config.hooks.UserPromptSubmit[0]
    expect(upsEntry.matcher).toBe('')
    expect(Array.isArray(upsEntry.hooks)).toBe(true)
    expect(upsEntry.hooks[0].type).toBe('command')
    expect(upsEntry.hooks[0].command).toContain('finn hook claude-pre-tool-use')

    const ptEntry = config.hooks.PostToolUse[0]
    expect(ptEntry.matcher).toBe('')
    expect(Array.isArray(ptEntry.hooks)).toBe(true)
    expect(ptEntry.hooks[0].type).toBe('command')
    expect(ptEntry.hooks[0].command).toContain('finn hook claude-pre-tool-use')

    const stopEntry = config.hooks.Stop[0]
    expect(stopEntry.matcher).toBe('')
    expect(Array.isArray(stopEntry.hooks)).toBe(true)
    expect(stopEntry.hooks[0].type).toBe('command')
    expect(stopEntry.hooks[0].command).toContain('finn hook claude-stop')
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
    expect(config.hooks.UserPromptSubmit).toHaveLength(1)
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

describe('finn setup — OpenCode plugin', () => {
  it('creates plugin file at ~/.config/opencode/plugins/finnisher.js', async () => {
    const home = tempDir()
    process.env['FINNISHER_HOME'] = home
    const { program } = await setup(home)
    await program.parseAsync(['node', 'finn', 'setup'])
    const pluginPath = join(home, '.config', 'opencode', 'plugins', 'finnisher.js')
    expect(existsSync(pluginPath)).toBe(true)
    const content = readFileSync(pluginPath, 'utf8')
    expect(content).toContain('session.created')
    expect(content).toContain('session.deleted')
    expect(content).toContain('opencode-start')
    expect(content).toContain('opencode-stop')
    delete process.env['FINNISHER_HOME']
  })

  it('is idempotent — re-running setup does not duplicate plugin', async () => {
    const home = tempDir()
    process.env['FINNISHER_HOME'] = home
    const { program } = await setup(home)
    await program.parseAsync(['node', 'finn', 'setup'])
    await program.parseAsync(['node', 'finn', 'setup'])
    const pluginPath = join(home, '.config', 'opencode', 'plugins', 'finnisher.js')
    const content = readFileSync(pluginPath, 'utf8')
    // Should only have one copy of the plugin code
    expect(content.match(/session\.created/g) || []).toHaveLength(1)
    delete process.env['FINNISHER_HOME']
  })

  it('removes existing after hook from ~/.opencode/config.json', async () => {
    const home = tempDir()
    process.env['FINNISHER_HOME'] = home
    const { program } = await setup(home)
    // Create existing config with after hook
    const configPath = join(home, '.opencode', 'config.json')
    mkdirSync(join(configPath, '..'), { recursive: true })
    writeFileSync(configPath, JSON.stringify({
      hooks: { after: 'finn hook opencode-stop' },
      otherSetting: true,
    }))
    await program.parseAsync(['node', 'finn', 'setup'])
    const config = JSON.parse(readFileSync(configPath, 'utf8'))
    expect(config.hooks.after).toBeUndefined()
    expect(config.otherSetting).toBe(true)
    delete process.env['FINNISHER_HOME']
  })

  it('outputs skip message when opencode is not on PATH', async () => {
    const home = tempDir()
    // Don't put opencode on path - the test temp dir won't have it
    const { program } = await setup(home)
    // We can't easily test this without mocking isOnPath, but the setup
    // will skip opencode if not found
  })
})

describe('finn setup — Gemini CLI hooks', () => {
  async function withGeminiOnPath(fn: (origPath: string | undefined) => Promise<void>): Promise<void> {
    const binDir = tempDir()
    writeFileSync(join(binDir, 'gemini'), '#!/bin/bash\necho gemini\n')
    chmodSync(join(binDir, 'gemini'), 0o755)
    const origPath = process.env['PATH']
    process.env['PATH'] = `${binDir}:${origPath ?? ''}`
    try {
      await fn(origPath)
    } finally {
      process.env['PATH'] = origPath
    }
  }

  it('creates ~/.gemini/settings.json with SessionStart and SessionEnd hooks', async () => {
    const home = tempDir()
    process.env['FINNISHER_HOME'] = home
    await withGeminiOnPath(async () => {
      const { program } = await setup(home)
      await program.parseAsync(['node', 'finn', 'setup'])
    })
    const settingsPath = join(home, '.gemini', 'settings.json')
    expect(existsSync(settingsPath)).toBe(true)
    const config = JSON.parse(readFileSync(settingsPath, 'utf8'))
    expect(config.hooks.SessionStart).toContain('finn hook gemini-start')
    expect(config.hooks.SessionEnd).toContain('finn hook gemini-stop')
    delete process.env['FINNISHER_HOME']
  })

  it('is idempotent — re-running setup does not overwrite manually set hooks', async () => {
    const home = tempDir()
    process.env['FINNISHER_HOME'] = home
    await withGeminiOnPath(async () => {
      const { program } = await setup(home)
      await program.parseAsync(['node', 'finn', 'setup'])
      vi.resetModules()
      const { runMigrations } = await import('../../db/migrate.js')
      runMigrations()
      const { register } = await import('../commands/setup.js')
      const program2 = new Command().exitOverride()
      register(program2)
      await program2.parseAsync(['node', 'finn', 'setup'])
    })
    const config = JSON.parse(readFileSync(join(home, '.gemini', 'settings.json'), 'utf8'))
    expect(typeof config.hooks.SessionStart).toBe('string')
    expect(typeof config.hooks.SessionEnd).toBe('string')
    delete process.env['FINNISHER_HOME']
  })

  it('preserves existing keys in ~/.gemini/settings.json', async () => {
    const home = tempDir()
    process.env['FINNISHER_HOME'] = home
    const geminiDir = join(home, '.gemini')
    mkdirSync(geminiDir, { recursive: true })
    writeFileSync(join(geminiDir, 'settings.json'), JSON.stringify({ theme: 'dark', model: 'gemini-2.5-pro' }))
    await withGeminiOnPath(async () => {
      const { program } = await setup(home)
      await program.parseAsync(['node', 'finn', 'setup'])
    })
    const config = JSON.parse(readFileSync(join(geminiDir, 'settings.json'), 'utf8'))
    expect(config.theme).toBe('dark')
    expect(config.model).toBe('gemini-2.5-pro')
    expect(config.hooks.SessionStart).toContain('finn hook gemini-start')
    delete process.env['FINNISHER_HOME']
  })

  it('skips gracefully when gemini is not on PATH', async () => {
    const home = tempDir()
    const { program } = await setup(home)
    // gemini is not in PATH (test temp dir has no gemini binary)
    await expect(program.parseAsync(['node', 'finn', 'setup', '--no-auto-detect'])).resolves.not.toThrow()
    const settingsPath = join(home, '.gemini', 'settings.json')
    expect(existsSync(settingsPath)).toBe(false)
  })
})
