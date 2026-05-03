import { appendHookLog, captureGitState } from './common.js';
import { closeSession, getOpenSessions } from '../db/sessions.js';
export function handleOpencodeStop(raw) {
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
        const projectPath = openSession.projectPath ?? process.cwd();
        const gitState = captureGitState(projectPath);
        closeSession(openSession.id, {
            endedAt: new Date(),
            gitBranch: gitState.gitBranch,
            lastCommitSha: gitState.lastCommitSha,
            lastCommitMsg: gitState.lastCommitMsg,
            unpushedCount: gitState.unpushedCount,
        });
        appendHookLog(`opencode-stop: closed session ${openSession.id}`);
    }
    catch (err) {
        appendHookLog(`opencode-stop error: ${String(err)}`);
    }
}
//# sourceMappingURL=opencode.js.map