import { appendHookLog, captureGitState, getFolderName, getGithubUrl, getThreadId, ensureThreadId } from './common.js'
import { closeSession, createSession, getOpenSessions } from '../db/sessions.js'
import { touchThread } from '../db/threads.js'

export function handleCodexStart(cwd?: string): void {
  try {
    const projectPath = cwd ?? process.cwd()
    const githubUrl = getGithubUrl(projectPath)
    const folderName = getFolderName(projectPath)
    const threadId = ensureThreadId(projectPath)
    const session = createSession({
      agent: 'codex',
      startedAt: new Date(),
      githubUrl,
      folderName,
      threadId,
      projectPath,
    })
    if (threadId) touchThread(threadId)
    appendHookLog(`codex-start: created session ${session.id} folder=${folderName ?? 'null'} threadId=${threadId ?? 'null'}`)
  } catch (err) {
    appendHookLog(`codex-start error: ${String(err)}`)
  }
}

export function handleCodexStop(cwd?: string): void {
  try {
    const openSession = getOpenSessions().find(s => s.agent === 'codex')
    if (!openSession) {
      appendHookLog('codex-stop: no open codex session found')
      return
    }

    const projectPath = cwd ?? openSession.projectPath ?? process.cwd()
    const gitState = captureGitState(projectPath)

    closeSession(openSession.id, {
      endedAt: new Date(),
      gitBranch: gitState.gitBranch,
      lastCommitSha: gitState.lastCommitSha,
      lastCommitMsg: gitState.lastCommitMsg,
      unpushedCount: gitState.unpushedCount,
    })

    if (openSession.threadId) touchThread(openSession.threadId)
    appendHookLog(`codex-stop: closed session ${openSession.id}`)
  } catch (err) {
    appendHookLog(`codex-stop error: ${String(err)}`)
  }
}
