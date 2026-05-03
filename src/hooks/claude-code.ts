import { appendHookLog, captureGitState, getFolderName, getGithubUrl, getThreadId } from './common.js'
import { closeSession, createSession, getOpenSessions } from '../db/sessions.js'

export function handleClaudeStart(payload: unknown): void {
  void payload
  try {
    const cwd = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
    const githubUrl = getGithubUrl(cwd)
    const folderName = getFolderName(cwd)
    const threadId = getThreadId(cwd)
    const session = createSession({
      agent: 'claude_code',
      startedAt: new Date(),
      githubUrl,
      folderName,
      threadId,
      projectPath: cwd,
    })
    appendHookLog(`claude-start: created session ${session.id} folder=${folderName ?? 'null'}`)
  } catch (err) {
    appendHookLog(`claude-start error: ${String(err)}`)
  }
}

export function handleClaudeStop(raw: string): void {
  try {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      appendHookLog('claude-stop: failed to parse JSON payload')
      return
    }

    const openSession = getOpenSessions().find(s => s.agent === 'claude_code')
    if (!openSession) {
      appendHookLog('claude-stop: no open claude_code session found')
      return
    }

    const cwd = openSession.projectPath ?? process.cwd()
    const gitState = captureGitState(cwd)

    let tokensIn: number | null = null
    let tokensOut: number | null = null
    let costUsd: number | null = null

    if (parsed !== null && typeof parsed === 'object') {
      const p = parsed as Record<string, unknown>
      if (typeof p['totalCostUSD'] === 'number') costUsd = p['totalCostUSD']
      const usage = p['usage']
      if (usage !== null && typeof usage === 'object') {
        const u = usage as Record<string, unknown>
        if (typeof u['input_tokens'] === 'number') tokensIn = u['input_tokens']
        if (typeof u['output_tokens'] === 'number') tokensOut = u['output_tokens']
      }
    }

    closeSession(openSession.id, {
      endedAt: new Date(),
      tokensIn,
      tokensOut,
      costUsd,
      gitBranch: gitState.gitBranch,
      lastCommitSha: gitState.lastCommitSha,
      lastCommitMsg: gitState.lastCommitMsg,
      unpushedCount: gitState.unpushedCount,
    })

    appendHookLog(
      `claude-stop: closed session ${openSession.id} cost=${costUsd ?? 'null'} tokensIn=${tokensIn ?? 'null'}`,
    )
  } catch (err) {
    appendHookLog(`claude-stop error: ${String(err)}`)
  }
}
