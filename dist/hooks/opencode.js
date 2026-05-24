import { appendHookLog, captureGitState, ensureThreadId } from './common.js';
import { closeSession, createSession, getOpenSessions } from '../db/sessions.js';
import { touchThread } from '../db/threads.js';
export function handleOpencodeStart(cwd = process.cwd()) {
    try {
        const projectPath = cwd;
        const threadId = ensureThreadId(projectPath);
        const existing = getOpenSessions().find(s => s.agent === 'opencode' && s.projectPath === projectPath);
        if (existing) {
            appendHookLog(`opencode-start: session already open for ${projectPath}`);
            return;
        }
        createSession({
            agent: 'opencode',
            threadId,
            projectPath,
            startedAt: new Date(),
        });
        if (threadId)
            touchThread(threadId);
        appendHookLog(`opencode-start: created session for ${projectPath} threadId=${threadId ?? 'null'}`);
    }
    catch (err) {
        appendHookLog(`opencode-start error: ${String(err)}`);
    }
}
export function handleOpencodeStop(raw, cwd) {
    try {
        try {
            JSON.parse(raw);
        }
        catch {
            appendHookLog('opencode-stop: failed to parse JSON payload');
            return;
        }
        const openSession = getOpenSessions().find(s => s.agent === 'opencode');
        if (!openSession) {
            appendHookLog('opencode-stop: no open opencode session found');
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
        if (openSession.threadId)
            touchThread(openSession.threadId);
        appendHookLog(`opencode-stop: closed session ${openSession.id}`);
    }
    catch (err) {
        appendHookLog(`opencode-stop error: ${String(err)}`);
    }
}
//# sourceMappingURL=opencode.js.map