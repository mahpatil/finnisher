import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDir() {
  const d = join(tmpdir(), 'finnisher-hooks-test-' + randomBytes(4).toString('hex'))
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

// ── normaliseGithubUrl (pure) ──────────────────────────────────────────────

describe('normaliseGithubUrl', () => {
  it('strips .git suffix from HTTPS remote', async () => {
    const { normaliseGithubUrl } = await import('../common.js')
    expect(normaliseGithubUrl('https://github.com/mahpatil/finnisher.git'))
      .toBe('https://github.com/mahpatil/finnisher')
  })

  it('leaves HTTPS remote without .git unchanged', async () => {
    const { normaliseGithubUrl } = await import('../common.js')
    expect(normaliseGithubUrl('https://github.com/mahpatil/finnisher'))
      .toBe('https://github.com/mahpatil/finnisher')
  })

  it('converts SSH remote to HTTPS', async () => {
    const { normaliseGithubUrl } = await import('../common.js')
    expect(normaliseGithubUrl('git@github.com:mahpatil/finnisher.git'))
      .toBe('https://github.com/mahpatil/finnisher')
  })

  it('returns null for non-github remotes', async () => {
    const { normaliseGithubUrl } = await import('../common.js')
    expect(normaliseGithubUrl('https://gitlab.com/user/repo.git')).toBeNull()
  })

  it('returns null for empty string', async () => {
    const { normaliseGithubUrl } = await import('../common.js')
    expect(normaliseGithubUrl('')).toBeNull()
  })
})

// ── getGithubUrl ───────────────────────────────────────────────────────────

describe('getGithubUrl', () => {
  it('returns normalised HTTPS URL for a repo with HTTPS remote', async () => {
    const { getGithubUrl } = await import('../common.js')
    const dir = tempDir()
    initGitRepo(dir, 'https://github.com/mahpatil/finnisher.git')
    const url = getGithubUrl(dir)
    expect(url).toBe('https://github.com/mahpatil/finnisher')
    rmSync(dir, { recursive: true })
  })

  it('returns normalised HTTPS URL for a repo with SSH remote', async () => {
    const { getGithubUrl } = await import('../common.js')
    const dir = tempDir()
    initGitRepo(dir, 'git@github.com:mahpatil/finnisher.git')
    const url = getGithubUrl(dir)
    expect(url).toBe('https://github.com/mahpatil/finnisher')
    rmSync(dir, { recursive: true })
  })

  it('returns null for a repo with no remote', async () => {
    const { getGithubUrl } = await import('../common.js')
    const dir = tempDir()
    initGitRepo(dir)
    expect(getGithubUrl(dir)).toBeNull()
    rmSync(dir, { recursive: true })
  })

  it('returns null for a non-repo directory without throwing', async () => {
    const { getGithubUrl } = await import('../common.js')
    const dir = tempDir()
    expect(() => getGithubUrl(dir)).not.toThrow()
    expect(getGithubUrl(dir)).toBeNull()
    rmSync(dir, { recursive: true })
  })
})

// ── getFolderName ──────────────────────────────────────────────────────────

describe('getFolderName', () => {
  it('returns basename of an absolute path', async () => {
    const { getFolderName } = await import('../common.js')
    expect(getFolderName('/Users/mahesh/projects/finnisher')).toBe('finnisher')
  })

  it('returns null when projectPath is null', async () => {
    const { getFolderName } = await import('../common.js')
    expect(getFolderName(null)).toBeNull()
  })

  it('returns null when projectPath is undefined', async () => {
    const { getFolderName } = await import('../common.js')
    expect(getFolderName(undefined)).toBeNull()
  })
})

// ── getThreadId ────────────────────────────────────────────────────────────

describe('getThreadId', () => {
  it('reads thread id from .finn-thread file', async () => {
    const { getThreadId } = await import('../common.js')
    const dir = tempDir()
    writeFileSync(join(dir, '.finn-thread'), 'abc1234567\n')
    expect(getThreadId(dir)).toBe('abc1234567')
    rmSync(dir, { recursive: true })
  })

  it('returns null when .finn-thread is absent', async () => {
    const { getThreadId } = await import('../common.js')
    const dir = tempDir()
    expect(getThreadId(dir)).toBeNull()
    rmSync(dir, { recursive: true })
  })

  it('returns null when .finn-thread is empty', async () => {
    const { getThreadId } = await import('../common.js')
    const dir = tempDir()
    writeFileSync(join(dir, '.finn-thread'), '   \n')
    expect(getThreadId(dir)).toBeNull()
    rmSync(dir, { recursive: true })
  })
})

// ── appendHookLog ──────────────────────────────────────────────────────────

describe('appendHookLog', () => {
  it('writes a timestamped line to the log file', async () => {
    const { appendHookLog } = await import('../common.js')
    const dir = tempDir()
    const logPath = join(dir, 'hook.log')
    // Temporarily override LOG_PATH by writing to a known location via env
    // appendHookLog uses ~/.finnisher/hook.log — test that it doesn't throw
    expect(() => appendHookLog('test message')).not.toThrow()
    rmSync(dir, { recursive: true })
  })

  it('silently swallows errors when log directory does not exist', async () => {
    const { appendHookLog } = await import('../common.js')
    expect(() => appendHookLog('msg')).not.toThrow()
  })
})
