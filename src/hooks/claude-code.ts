import { appendHookLog, captureGitState, getFolderName, getGithubUrl, ensureThreadId, extractUsageMetrics, detectEffortType } from './common.js'
import { backfillNullThreadSessions, closeSession, createSession, getOpenSessions } from '../db/sessions.js'
import { touchThread } from '../db/threads.js'

const STALE_SESSION_MS = 24 * 60 * 60 * 1000

export function handleClaudeStart(payload: unknown, cwd?: string): void {
  void payload
  try {
    const dir = cwd ?? process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
    const existing = getOpenSessions().find(s => s.agent === 'claude_code' && s.projectPath === dir)
    if (existing) {
      const ageMs = Date.now() - existing.startedAt.getTime()
      if (ageMs < STALE_SESSION_MS) {
        // Same-day session — deduplicate but keep the thread fresh
        if (existing.threadId) touchThread(existing.threadId)
        return
      }
      // Stale session — auto-close before starting a new one
      closeSession(existing.id, { endedAt: new Date(), frictionScore: 0, effortType: 'validation' })
      appendHookLog(`claude-start: auto-closed stale session ${existing.id} (age: ${Math.round(ageMs / 3600000)}h)`)
    }
    const githubUrl = getGithubUrl(dir)
    const folderName = getFolderName(dir)
    const threadId = ensureThreadId(dir)
    const session = createSession({
      agent: 'claude_code',
      startedAt: new Date(),
      githubUrl,
      folderName,
      threadId,
      projectPath: dir,
    })
    if (threadId) {
      touchThread(threadId)
      backfillNullThreadSessions(dir, threadId)
    }
    appendHookLog(`claude-start: created session ${session.id} folder=${folderName ?? 'null'} threadId=${threadId ?? 'null'}`)
  } catch (err) {
    appendHookLog(`claude-start error: ${String(err)}`)
  }
}

export function handleClaudeStop(raw: string, cwd?: string): void {
  try {
    let parsed: any = null
    try {
      parsed = JSON.parse(raw)
    } catch {
      appendHookLog('claude-stop: payload is not valid JSON')
      return
    }

    const openSession = getOpenSessions().find(
      s => s.agent === 'claude_code' && (!cwd || s.projectPath === cwd),
    ) ?? getOpenSessions().find(s => s.agent === 'claude_code')
    if (!openSession) {
      appendHookLog('claude-stop: no open claude_code session found')
      return
    }

    const projectPath = cwd ?? openSession.projectPath ?? process.cwd()
    const gitState = captureGitState(projectPath)

    const metrics = extractUsageMetrics(raw)
    let tokensIn = metrics.tokensIn
    let tokensOut = metrics.tokensOut
    let costUsd = metrics.costUsd
    let agentId: string | null = null
    let effortType = detectEffortType(raw)
    let frictionScore = 0

    // Try to extract friction (retries)
    const retryMatch = raw.match(/(?:retry|attempt)\s*#?(\d+)/i)
    if (retryMatch) frictionScore = parseInt(retryMatch[1], 10) - 1

    if (parsed !== null && typeof parsed === 'object') {
      const p = parsed as Record<string, unknown>
      if (typeof p['total_cost_usd'] === 'number') costUsd = p['total_cost_usd']
      else if (typeof p['totalCostUSD'] === 'number') costUsd = p['totalCostUSD']
      
      if (typeof p['tokensIn'] === 'number') tokensIn = p['tokensIn']
      if (typeof p['tokensOut'] === 'number') tokensOut = p['tokensOut']
      
      const usage = p['usage']
      if (usage !== null && typeof usage === 'object') {
        const u = usage as Record<string, unknown>
        if (typeof u['input_tokens'] === 'number') tokensIn = u['input_tokens']
        if (typeof u['output_tokens'] === 'number') tokensOut = u['output_tokens']
      }

      if (typeof p['model'] === 'string') agentId = p['model']
      else if (typeof p['agentId'] === 'string') agentId = p['agentId']
    }

    closeSession(openSession.id, {
      endedAt: new Date(),
      tokensIn,
      tokensOut,
      costUsd,
      agentId,
      effortType,
      frictionScore,
      gitBranch: gitState.gitBranch,
      lastCommitSha: gitState.lastCommitSha,
      lastCommitMsg: gitState.lastCommitMsg,
      unpushedCount: gitState.unpushedCount,
    })

    if (openSession.threadId) touchThread(openSession.threadId)

    appendHookLog(
      `claude-stop: closed session ${openSession.id} cost=${costUsd ?? 'null'} friction=${frictionScore}`,
    )
  } catch (err) {
    appendHookLog(`claude-stop error: ${String(err)}`)
  }
}
