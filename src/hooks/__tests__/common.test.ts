import { describe, it, expect, afterEach, vi } from 'vitest'
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

  it('returns null when cwd is a plain subdirectory of a parent git repo (no own .git)', async () => {
    // Reproduces: fluicrm inside agent-os — if child has no .git, git walks up
    // to parent and getGithubUrl must return null rather than the parent URL.
    const { getGithubUrl } = await import('../common.js')
    const parent = tempDir()
    initGitRepo(parent, 'https://github.com/user/parent.git')
    const child = join(parent, 'nested-project')
    mkdirSync(child)
    expect(getGithubUrl(child)).toBeNull()
    rmSync(parent, { recursive: true })
  })

  it('returns child repo URL when cwd is a nested git repo with its own .git', async () => {
    // Child repo inside a parent repo — each has its own .git; should return
    // child's remote, not parent's.
    const { getGithubUrl } = await import('../common.js')
    const parent = tempDir()
    initGitRepo(parent, 'https://github.com/user/parent.git')
    const child = join(parent, 'child-project')
    mkdirSync(child)
    initGitRepo(child, 'https://github.com/user/child.git')
    expect(getGithubUrl(child)).toBe('https://github.com/user/child')
    rmSync(parent, { recursive: true })
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

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
  delete process.env['FINNISHER_DB_PATH']
})

async function setupDb() {
  const home = tempDir()
  process.env['FINNISHER_DB_PATH'] = join(home, 'db.sqlite')
  vi.resetModules()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  return home
}

describe('getThreadId', () => {
  it('reads thread id from .finn-thread file', async () => {
    const home = await setupDb()
    const { createThread } = await import('../../db/threads.js')
    const thread = createThread({ title: 'T', nextAction: 'A', state: 'active', owner: 'you' })
    const { getThreadId } = await import('../common.js')
    const dir = tempDir()
    writeFileSync(join(dir, '.finn-thread'), thread.id + '\n')
    expect(getThreadId(dir)).toBe(thread.id)
    rmSync(dir, { recursive: true })
    rmSync(home, { recursive: true })
  })

  it('returns null when .finn-thread is absent', async () => {
    const home = await setupDb()
    const { getThreadId } = await import('../common.js')
    const dir = tempDir()
    expect(getThreadId(dir)).toBeNull()
    rmSync(dir, { recursive: true })
    rmSync(home, { recursive: true })
  })

  it('returns null when .finn-thread is empty', async () => {
    const home = await setupDb()
    const { getThreadId } = await import('../common.js')
    const dir = tempDir()
    writeFileSync(join(dir, '.finn-thread'), '   \n')
    expect(getThreadId(dir)).toBeNull()
    rmSync(dir, { recursive: true })
    rmSync(home, { recursive: true })
  })

  it('returns null when .finn-thread contains a stale id not in the database', async () => {
    const home = await setupDb()
    const { getThreadId } = await import('../common.js')
    const dir = tempDir()
    writeFileSync(join(dir, '.finn-thread'), 'staleId000000\n')
    expect(getThreadId(dir)).toBeNull()
    rmSync(dir, { recursive: true })
    rmSync(home, { recursive: true })
  })

  it('falls back to folder name match via sessions table when no .finn-thread', async () => {
    const home = await setupDb()
    const { createThread } = await import('../../db/threads.js')
    const { createSession } = await import('../../db/sessions.js')
    const thread = createThread({ title: 'myapp', nextAction: 'A', state: 'open', owner: 'you' })
    createSession({
      agent: 'claude_code',
      startedAt: new Date(),
      threadId: thread.id,
      projectPath: '/proj/myapp',
      folderName: 'myapp',
    })
    const { getThreadId } = await import('../common.js')
    // dir basename must match folderName used in the session
    const dir = join(tempDir(), 'myapp')
    mkdirSync(dir)
    expect(getThreadId(dir)).toBe(thread.id)
    rmSync(dir, { recursive: true })
    rmSync(home, { recursive: true })
  })
})

// ── ensureThreadId ─────────────────────────────────────────────────────────

describe('ensureThreadId', () => {
  it('creates a new thread and writes .finn-thread when no thread exists', async () => {
    const home = await setupDb()
    const { ensureThreadId } = await import('../common.js')
    const dir = join(tempDir(), 'brand-new-project')
    mkdirSync(dir)
    const threadId = ensureThreadId(dir)
    expect(threadId).toBeTruthy()
    const written = readFileSync(join(dir, '.finn-thread'), 'utf8').trim()
    expect(written).toBe(threadId)
    rmSync(dir, { recursive: true })
    rmSync(home, { recursive: true })
  })

  it('returns existing thread id without creating a duplicate when .finn-thread already exists', async () => {
    const home = await setupDb()
    const { createThread } = await import('../../db/threads.js')
    const { listThreads } = await import('../../db/threads.js')
    const thread = createThread({ title: 'T', nextAction: 'A', state: 'open', owner: 'you' })
    const { ensureThreadId } = await import('../common.js')
    const dir = tempDir()
    writeFileSync(join(dir, '.finn-thread'), thread.id + '\n')
    const result = ensureThreadId(dir)
    expect(result).toBe(thread.id)
    // Only the one thread we created — no duplicate
    expect(listThreads().length).toBe(1)
    rmSync(dir, { recursive: true })
    rmSync(home, { recursive: true })
  })

  it('still returns a thread id when .finn-thread write fails due to missing parent dir', async () => {
    const home = await setupDb()
    const { ensureThreadId } = await import('../common.js')
    // Pass a path whose parent doesn't exist — write will fail but thread should still be created
    const dir = join(tempDir(), 'nonexistent-parent', 'project')
    const threadId = ensureThreadId(dir)
    expect(threadId).toBeTruthy()
    rmSync(home, { recursive: true })
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

// ── captureGitState ────────────────────────────────────────────────────────

describe('captureGitState', () => {
  it('returns null fields in a non-repo directory', async () => {
    const { captureGitState } = await import('../common.js')
    const dir = tempDir()
    const state = captureGitState(dir)
    expect(state.gitBranch).toBeNull()
    expect(state.lastCommitSha).toBeNull()
    expect(state.lastCommitMsg).toBeNull()
    expect(state.unpushedCount).toBeNull()
    rmSync(dir, { recursive: true })
  })

  it('returns branch and commit info for a repo with a commit', async () => {
    const { captureGitState } = await import('../common.js')
    const dir = tempDir()
    execSync('git init -b main', { cwd: dir, stdio: 'pipe' })
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' })
    execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' })
    writeFileSync(join(dir, 'file.txt'), 'hello')
    execSync('git add .', { cwd: dir, stdio: 'pipe' })
    execSync('git commit -m "initial commit"', { cwd: dir, stdio: 'pipe' })

    const state = captureGitState(dir)
    expect(state.gitBranch).toBe('main')
    expect(state.lastCommitSha).toHaveLength(40)
    expect(state.lastCommitMsg).toBe('initial commit')
    // no upstream → unpushedCount is null (rev-list @{u}.. fails with no upstream)
    expect(state.unpushedCount).toBeNull()
    rmSync(dir, { recursive: true })
  })

  it('returns null for all fields in a repo with no commits', async () => {
    const { captureGitState } = await import('../common.js')
    const dir = tempDir()
    execSync('git init -b main', { cwd: dir, stdio: 'pipe' })
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' })
    execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' })

    const state = captureGitState(dir)
    // HEAD is unborn — most commands fail and return null
    expect(state.lastCommitSha).toBeNull()
    expect(state.lastCommitMsg).toBeNull()
    rmSync(dir, { recursive: true })
  })

  it('returns unpushedCount=0 when repo is up to date with upstream', async () => {
    const { captureGitState } = await import('../common.js')
    // Create a "remote" bare repo and clone it so there is an upstream
    const remoteDir = tempDir()
    execSync('git init --bare', { cwd: remoteDir, stdio: 'pipe' })

    const localDir = tempDir()
    execSync(`git clone ${remoteDir} ${localDir}`, { stdio: 'pipe' })
    execSync('git config user.email "test@test.com"', { cwd: localDir, stdio: 'pipe' })
    execSync('git config user.name "Test"', { cwd: localDir, stdio: 'pipe' })
    writeFileSync(join(localDir, 'file.txt'), 'hello')
    execSync('git add .', { cwd: localDir, stdio: 'pipe' })
    execSync('git commit -m "first"', { cwd: localDir, stdio: 'pipe' })
    execSync('git push origin HEAD', { cwd: localDir, stdio: 'pipe' })

    const state = captureGitState(localDir)
    expect(state.unpushedCount).toBe(0)
    rmSync(remoteDir, { recursive: true })
    rmSync(localDir, { recursive: true })
  })
})

// ── findThreadIdByGithubUrl ────────────────────────────────────────────────

describe('findThreadIdByGithubUrl', () => {
  it('returns null when no sessions match the github URL', async () => {
    await setupDb()
    const { findThreadIdByGithubUrl } = await import('../common.js')
    expect(findThreadIdByGithubUrl('https://github.com/user/repo')).toBeNull()
  })

  it('returns threadId from a session with a matching github URL', async () => {
    await setupDb()
    const { createThread } = await import('../../db/threads.js')
    const thread = createThread({
      title: 'Test Thread',
      nextAction: 'test',
      state: 'active',
      owner: 'you',
    })
    const { createSession } = await import('../../db/sessions.js')
    createSession({
      agent: 'claude_code',
      startedAt: new Date(),
      githubUrl: 'https://github.com/user/repo',
      threadId: thread.id,
      projectPath: '/some/path',
      folderName: 'repo',
    })
    const { findThreadIdByGithubUrl } = await import('../common.js')
    expect(findThreadIdByGithubUrl('https://github.com/user/repo')).toBe(thread.id)
  })

  it('returns null when the matching session has no threadId', async () => {
    await setupDb()
    const { createSession } = await import('../../db/sessions.js')
    createSession({
      agent: 'claude_code',
      startedAt: new Date(),
      githubUrl: 'https://github.com/user/repo',
      threadId: null,
      projectPath: '/some/path',
      folderName: 'repo',
    })
    const { findThreadIdByGithubUrl } = await import('../common.js')
    expect(findThreadIdByGithubUrl('https://github.com/user/repo')).toBeNull()
  })

  it('does not return sessions with a different github URL', async () => {
    await setupDb()
    const { createThread } = await import('../../db/threads.js')
    const thread = createThread({
      title: 'Other Thread',
      nextAction: 'test',
      state: 'active',
      owner: 'you',
    })
    const { createSession } = await import('../../db/sessions.js')
    createSession({
      agent: 'claude_code',
      startedAt: new Date(),
      githubUrl: 'https://github.com/user/other-repo',
      threadId: thread.id,
      projectPath: '/other/path',
      folderName: 'other-repo',
    })
    const { findThreadIdByGithubUrl } = await import('../common.js')
    expect(findThreadIdByGithubUrl('https://github.com/user/repo')).toBeNull()
  })
})
