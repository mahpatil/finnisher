import { appendHookLog, captureGitState, getFolderName, getGithubUrl, getThreadId } from './common.js';
import { closeSession, createSession, getOpenSessions } from '../db/sessions.js';
export function handleClaudeStart(payload, cwd) {
    void payload;
    try {
        const dir = cwd ?? process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd();
        const existing = getOpenSessions().find(s => s.agent === 'claude_code' && s.projectPath === dir);
        if (existing)
            return;
        const githubUrl = getGithubUrl(dir);
        const folderName = getFolderName(dir);
        const threadId = getThreadId(dir);
        const session = createSession({
            agent: 'claude_code',
            startedAt: new Date(),
            githubUrl,
            folderName,
            threadId,
            projectPath: dir,
        });
        appendHookLog(`claude-start: created session ${session.id} folder=${folderName ?? 'null'}`);
    }
    catch (err) {
        appendHookLog(`claude-start error: ${String(err)}`);
    }
}
export function handleClaudeStop(raw, cwd) {
    try {
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            appendHookLog('claude-stop: failed to parse JSON payload');
            return;
        }
        const openSession = getOpenSessions().find(s => s.agent === 'claude_code' && (!cwd || s.projectPath === cwd)) ?? getOpenSessions().find(s => s.agent === 'claude_code');
        if (!openSession) {
            appendHookLog('claude-stop: no open claude_code session found');
            return;
        }
        const projectPath = cwd ?? openSession.projectPath ?? process.cwd();
        const gitState = captureGitState(projectPath);
        let tokensIn = null;
        let tokensOut = null;
        let costUsd = null;
        if (parsed !== null && typeof parsed === 'object') {
            const p = parsed;
            if (typeof p['totalCostUSD'] === 'number')
                costUsd = p['totalCostUSD'];
            // flat format: { tokensIn, tokensOut }
            if (typeof p['tokensIn'] === 'number')
                tokensIn = p['tokensIn'];
            if (typeof p['tokensOut'] === 'number')
                tokensOut = p['tokensOut'];
            // nested format: { usage: { input_tokens, output_tokens } }
            const usage = p['usage'];
            if (usage !== null && typeof usage === 'object') {
                const u = usage;
                if (typeof u['input_tokens'] === 'number')
                    tokensIn = u['input_tokens'];
                if (typeof u['output_tokens'] === 'number')
                    tokensOut = u['output_tokens'];
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
        });
        appendHookLog(`claude-stop: closed session ${openSession.id} cost=${costUsd ?? 'null'} tokensIn=${tokensIn ?? 'null'}`);
    }
    catch (err) {
        appendHookLog(`claude-stop error: ${String(err)}`);
    }
}
//# sourceMappingURL=claude-code.js.map