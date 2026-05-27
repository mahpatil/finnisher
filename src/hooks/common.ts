import { execSync } from 'child_process'
import { basename, join } from 'path'
import { appendFileSync, readFileSync, realpathSync } from 'fs'
import { homedir } from 'os'
import { listSessions } from '../db/sessions.js'
import { findThreadIdByFolderName, createThread, getThread } from '../db/threads.js'
import { writeFileSync } from 'fs'

export interface GitState {
  gitBranch: string | null
  lastCommitSha: string | null
  lastCommitMsg: string | null
  unpushedCount: number | null
}

export function captureGitState(cwd: string): GitState {
  const execGit = (cmd: string): string | null => {
    try {
      return execSync(cmd, { cwd, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' }).trim()
    } catch {
      return null
    }
  }

  const gitBranch = execGit('git rev-parse --abbrev-ref HEAD')
  const lastCommitSha = execGit('git rev-parse HEAD')
  const lastCommitMsg = execGit('git log -1 --format=%s')
  const unpushedRaw = execGit('git rev-list @{u}.. --count')
  const unpushedCount = unpushedRaw !== null ? parseInt(unpushedRaw, 10) : null

  return { gitBranch, lastCommitSha, lastCommitMsg, unpushedCount }
}

const LOG_PATH = join(homedir(), '.finnisher', 'hook.log')

export function appendHookLog(message: string): void {
  const line = `[${new Date().toISOString()}] ${message}\n`
  try {
    appendFileSync(LOG_PATH, line)
  } catch {
    // log dir may not exist yet — silently swallow
  }
}

export function normaliseGithubUrl(raw: string): string | null {
  if (!raw) return null

  let url = raw.trim()

  // SSH: git@github.com:user/repo.git → https://github.com/user/repo
  const sshMatch = url.match(/^git@github\.com:(.+?)(?:\.git)?$/)
  if (sshMatch) return `https://github.com/${sshMatch[1]}`

  // HTTPS: must be github.com
  if (!url.includes('github.com')) return null

  // Strip trailing .git
  url = url.replace(/\.git$/, '')
  return url
}

export function getGithubUrl(cwd: string): string | null {
  try {
    // Verify the resolved git root is cwd itself — prevents walking up into a
    // parent repo (e.g. fluicrm nested inside agent-os) and returning the
    // wrong remote. Use realpathSync to normalise symlinks (macOS /tmp →
    // /private/tmp) before comparing.
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    const realCwd = (() => { try { return realpathSync(cwd) } catch { return cwd } })()
    if (gitRoot !== realCwd) return null

    const raw = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    return normaliseGithubUrl(raw)
  } catch {
    return null
  }
}

export function getFolderName(projectPath: string | null | undefined): string | null {
  if (!projectPath) return null
  return basename(projectPath)
}

export interface UsageMetrics {
  tokensIn: number | null
  tokensOut: number | null
  costUsd: number | null
}

export function extractUsageMetrics(text: string): UsageMetrics {
  const metrics: UsageMetrics = { tokensIn: null, tokensOut: null, costUsd: null }

  // Tokens: "input: 1,000" or "input_tokens: 1000"
  const inputMatch = text.match(/(?:input(?:_tokens)?):\s*([\d,]+)/i)
  if (inputMatch) metrics.tokensIn = parseInt(inputMatch[1].replace(/,/g, ''), 10)

  const outputMatch = text.match(/(?:output(?:_tokens)?):\s*([\d,]+)/i)
  if (outputMatch) metrics.tokensOut = parseInt(outputMatch[1].replace(/,/g, ''), 10)

  // Cost: "$0.0421" or "cost: 0.0421"
  const costMatch = text.match(/(?:\$|cost:?\s*)([\d.]+)/i)
  if (costMatch) metrics.costUsd = parseFloat(costMatch[1])

  return metrics
}

export type EffortType = 'debugging' | 'feature' | 'refactor' | 'documentation' | 'validation'

export function detectEffortType(text: string): EffortType {
  const low = text.toLowerCase()
  if (low.includes('debug') || low.includes('fix') || low.includes('issue')) return 'debugging'
  if (low.includes('refactor')) return 'refactor'
  if (low.includes('doc') || low.includes('readme')) return 'documentation'
  if (low.includes('test') || low.includes('validate') || low.includes('verify')) return 'validation'
  if (low.includes('feat') || low.includes('add') || low.includes('build')) return 'feature'
  return 'validation' // default
}

export function getThreadId(cwd: string = process.cwd()): string | null {
  // 1. First check for .finn-thread file (backward compatibility)
  try {
    const fileContent = readFileSync(join(cwd, '.finn-thread'), 'utf8')
    const threadIdFromFile = fileContent.trim()
    if (threadIdFromFile) {
      // Verify thread exists in DB to avoid FK violations
      const thread = getThread(threadIdFromFile)
      if (thread) return threadIdFromFile
      // If not in DB, continue to other checks
    }
  } catch {
    // File doesn't exist or other error - continue to GitHub check
  }

  // 2. Check for GitHub URL match
  const githubUrl = getGithubUrl(cwd)
  if (githubUrl) {
    const matchingThreadId = findThreadIdByGithubUrl(githubUrl)
    if (matchingThreadId) {
      // Verify thread still exists
      if (getThread(matchingThreadId)) return matchingThreadId
    }
  }

  // 3. Check for Folder Name match
  const folderName = getFolderName(cwd)
  if (folderName) {
    const matchingThreadId = findThreadIdByFolderName(folderName)
    if (matchingThreadId) {
      // Verify thread still exists
      if (getThread(matchingThreadId)) return matchingThreadId
    }
  }

  // 4. No thread found
  return null
}

// Helper function to find thread ID by GitHub URL
export function findThreadIdByGithubUrl(githubUrl: string): string | null {
  try {
    const sessions = listSessions({ githubUrl, limit: 1 })
    if (sessions && sessions.length > 0) {
      return sessions[0].threadId
    }
  } catch (err) {
    appendHookLog(`findThreadIdByGithubUrl error: ${String(err)}`)
  }
  return null
}

export function ensureThreadId(cwd: string = process.cwd()): string | null {
  const existing = getThreadId(cwd)
  if (existing) {
    // Heal stale .finn-thread: if the file points to a different (deleted) thread,
    // overwrite it with the resolved ID so future lookups skip the fallback path.
    try {
      const threadIdFile = join(cwd, '.finn-thread')
      const stored = readFileSync(threadIdFile, 'utf8').trim()
      if (stored !== existing) {
        writeFileSync(threadIdFile, existing + '\n', { encoding: 'utf8' })
        appendHookLog(`ensureThreadId: healed stale .finn-thread ${stored} → ${existing}`)
      }
    } catch {
      // File absent or unwritable — silently skip
    }
    return existing
  }

  try {
    const folderName = getFolderName(cwd) || 'Unknown Project'
    const thread = createThread({
      title: `${folderName} Development`,
      nextAction: 'Continue development',
      state: 'open',
      owner: 'you',
    })

    try {
      const threadIdFile = join(cwd, '.finn-thread')
      writeFileSync(threadIdFile, thread.id + '\n', { encoding: 'utf8' })
    } catch (fileErr) {
      appendHookLog(`ensureThreadId: failed to write .finn-thread file: ${String(fileErr)}`)
      // Continue anyway, we have the thread in DB
    }

    appendHookLog(`ensureThreadId: created new thread ${thread.id} for ${folderName}`)
    return thread.id
  } catch (err) {
    appendHookLog(`ensureThreadId error: ${String(err)}`)
    return null
  }
}
