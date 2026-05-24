import { appendHookLog, captureGitState, getFolderName, getGithubUrl, ensureThreadId, extractUsageMetrics, detectEffortType } from './common.js';
import { closeSession, createSession, getOpenSessions } from '../db/sessions.js';
import { touchThread } from '../db/threads.js';
export function handleClaudeStart(payload, cwd) {
    void payload;
    try {
        const dir = cwd ?? process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd();
        const existing = getOpenSessions().find(s => s.agent === 'claude_code' && s.projectPath === dir);
        if (existing)
            return;
        const githubUrl = getGithubUrl(dir);
        const folderName = getFolderName(dir);
        const threadId = ensureThreadId(dir);
        const session = createSession({
            agent: 'claude_code',
            startedAt: new Date(),
            githubUrl,
            folderName,
            threadId,
            projectPath: dir,
        });
        if (threadId)
            touchThread(threadId);
        appendHookLog(`claude-start: created session ${session.id} folder=${folderName ?? 'null'} threadId=${threadId ?? 'null'}`);
    }
    catch (err) {
        appendHookLog(`claude-start error: ${String(err)}`);
    }
}
export function handleClaudeStop(raw, cwd) {
    try {
        let parsed = null;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            appendHookLog('claude-stop: payload is not valid JSON');
            return;
        }
        const openSession = getOpenSessions().find(s => s.agent === 'claude_code' && (!cwd || s.projectPath === cwd)) ?? getOpenSessions().find(s => s.agent === 'claude_code');
        if (!openSession) {
            appendHookLog('claude-stop: no open claude_code session found');
            return;
        }
        const projectPath = cwd ?? openSession.projectPath ?? process.cwd();
        const gitState = captureGitState(projectPath);
        const metrics = extractUsageMetrics(raw);
        let tokensIn = metrics.tokensIn;
        let tokensOut = metrics.tokensOut;
        let costUsd = metrics.costUsd;
        let agentId = null;
        let effortType = detectEffortType(raw);
        let frictionScore = 0;
        // Try to extract friction (retries)
        const retryMatch = raw.match(/(?:retry|attempt)\s*#?(\d+)/i);
        if (retryMatch)
            frictionScore = parseInt(retryMatch[1], 10) - 1;
        if (parsed !== null && typeof parsed === 'object') {
            const p = parsed;
            if (typeof p['total_cost_usd'] === 'number')
                costUsd = p['total_cost_usd'];
            else if (typeof p['totalCostUSD'] === 'number')
                costUsd = p['totalCostUSD'];
            if (typeof p['tokensIn'] === 'number')
                tokensIn = p['tokensIn'];
            if (typeof p['tokensOut'] === 'number')
                tokensOut = p['tokensOut'];
            const usage = p['usage'];
            if (usage !== null && typeof usage === 'object') {
                const u = usage;
                if (typeof u['input_tokens'] === 'number')
                    tokensIn = u['input_tokens'];
                if (typeof u['output_tokens'] === 'number')
                    tokensOut = u['output_tokens'];
            }
            if (typeof p['model'] === 'string')
                agentId = p['model'];
            else if (typeof p['agentId'] === 'string')
                agentId = p['agentId'];
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
        });
        if (openSession.threadId)
            touchThread(openSession.threadId);
        appendHookLog(`claude-stop: closed session ${openSession.id} cost=${costUsd ?? 'null'} friction=${frictionScore}`);
    }
    catch (err) {
        appendHookLog(`claude-stop error: ${String(err)}`);
    }
}
//# sourceMappingURL=claude-code.js.map