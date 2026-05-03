import { appendHookLog, captureGitState, getFolderName, getGithubUrl, getThreadId } from './common.js';
import { closeSession, createSession, getOpenSessions } from '../db/sessions.js';
export function handleCodexStart(cwd) {
    try {
        const projectPath = cwd ?? process.cwd();
        const githubUrl = getGithubUrl(projectPath);
        const folderName = getFolderName(projectPath);
        const threadId = getThreadId(projectPath);
        const session = createSession({
            agent: 'codex',
            startedAt: new Date(),
            githubUrl,
            folderName,
            threadId,
            projectPath,
        });
        appendHookLog(`codex-start: created session ${session.id} folder=${folderName ?? 'null'}`);
    }
    catch (err) {
        appendHookLog(`codex-start error: ${String(err)}`);
    }
}
export function handleCodexStop(cwd) {
    try {
        const openSession = getOpenSessions().find(s => s.agent === 'codex');
        if (!openSession) {
            appendHookLog('codex-stop: no open codex session found');
            return;
        }
        const projectPath = cwd ?? openSession.projectPath ?? process.cwd();
        const gitState = captureGitState(projectPath);
        closeSession(openSession.id, {
            endedAt: new Date(),
            gitBranch: gitState.gitBranch,
            lastCommitSha: gitState.lastCommitSha,
            lastCommitMsg: gitState.lastCommitMsg,
            unpushedCount: gitState.unpushedCount,
        });
        appendHookLog(`codex-stop: closed session ${openSession.id}`);
    }
    catch (err) {
        appendHookLog(`codex-stop error: ${String(err)}`);
    }
}
//# sourceMappingURL=codex.js.map