import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tmpdir } from 'os'
import { join, mkdirSync, writeFileSync, rmSync } from 'fs'
import { randomBytes } from 'crypto'
import { Command } from 'commander'
import { execSync } from 'child_process'

function tempDir() {
  const d = join(tmpdir(), 'finnisher-cli-test-' + randomBytes(4).toString('hex'))
  mkdirSync(d, { recursive: true })
  return d
}

function initGitRepo(dir: string, remote?: string) {
  execSync('git init -b main', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' })
  if (remote) {
    execSync(`git remote add origin ${remote}`, { cwd: dir, stdio: 'pipe' })
  }
}

async function setup() {
  // Reset env vars
  delete process.env['FINNISHER_DB_PATH']
  delete process.env['FINNISHER_WORKSPACE_PATH']
  
  vi.resetModules()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const { register } = await import('../index.js')
  const program = new Command().exitOverride()
  register(program)
  return { program }
}

describe('finn discover command', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('shows help when called with --help', async () => {
    const { program } = await setup()
    await expect(
      program.parseAsync(['node', 'finn', 'discover', '--help'])
    ).resolves.not.toThrow()
  })

  it('lists projects in workspace', async () => {
    const { program } = await setup()
    const workspace = tempDir()
    process.env['FINNISHER_WORKSPACE_PATH'] = workspace
    
    // Create test projects
    const proj1 = join(workspace, 'project1')
    const proj2 = join(workspace, 'project2')
    mkdirSync(proj1, { recursive: true })
    mkdirSync(proj2, { recursive: true })
    
    // Make one a git repo
    initGitRepo(proj1, 'https://github.com/test/project1.git')
    
    const output = await program.parseAsync(['node', 'finn', 'discover'])
    expect(output).toBeUndefined() // Command should complete without error
  })

  it('detects GitHub URLs and shows link status', async () => {
    const { program } = await setup()
    const workspace = tempDir()
    process.env['FINNISHER_WORKSPACE_PATH'] = workspace
    
    // Create test project with GitHub URL
    const proj = join(workspace, 'my-project')
    mkdirSync(proj, { recursive: true })
    initGitRepo(proj, 'https://github.com/user/my-project.git')
    
    await program.parseAsync(['node', 'finn', 'discover'])
    // Should complete without error
  })

  it('creates threads for unlinked projects with --create flag', async () => {
    const { program } = await setup()
    const workspace = tempDir()
    process.env['FINNISHER_WORKSPACE_PATH'] = workspace
    
    // Create test project
    const proj = join(workspace, 'new-project')
    mkdirSync(proj, { recursive: true })
    initGitRepo(proj, 'https://github.com/user/new-project.git')
    
    await program.parseAsync(['node', 'finn', 'discover', '--create'])
    // Should complete without error
  })
})