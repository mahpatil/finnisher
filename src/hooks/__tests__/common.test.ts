import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
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
