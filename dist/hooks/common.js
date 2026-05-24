import { execSync } from 'child_process';
import { basename, join } from 'path';
import { appendFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { listSessions } from '../db/sessions.js';
import { findThreadIdByFolderName, createThread, getThread } from '../db/threads.js';
import { writeFileSync } from 'fs';
export function captureGitState(cwd) {
    const execGit = (cmd) => {
        try {
            return execSync(cmd, { cwd, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
        }
        catch {
            return null;
        }
    };
    const gitBranch = execGit('git rev-parse --abbrev-ref HEAD');
    const lastCommitSha = execGit('git rev-parse HEAD');
    const lastCommitMsg = execGit('git log -1 --format=%s');
    const unpushedRaw = execGit('git rev-list @{u}.. --count');
    const unpushedCount = unpushedRaw !== null ? parseInt(unpushedRaw, 10) : null;
    return { gitBranch, lastCommitSha, lastCommitMsg, unpushedCount };
}
const LOG_PATH = join(homedir(), '.finnisher', 'hook.log');
export function appendHookLog(message) {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    try {
        appendFileSync(LOG_PATH, line);
    }
    catch {
        // log dir may not exist yet — silently swallow
    }
}
export function normaliseGithubUrl(raw) {
    if (!raw)
        return null;
    let url = raw.trim();
    // SSH: git@github.com:user/repo.git → https://github.com/user/repo
    const sshMatch = url.match(/^git@github\.com:(.+?)(?:\.git)?$/);
    if (sshMatch)
        return `https://github.com/${sshMatch[1]}`;
    // HTTPS: must be github.com
    if (!url.includes('github.com'))
        return null;
    // Strip trailing .git
    url = url.replace(/\.git$/, '');
    return url;
}
export function getGithubUrl(cwd) {
    try {
        const raw = execSync('git remote get-url origin', {
            cwd,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        return normaliseGithubUrl(raw);
    }
    catch {
        return null;
    }
}
export function getFolderName(projectPath) {
    if (!projectPath)
        return null;
    return basename(projectPath);
}
export function extractUsageMetrics(text) {
    const metrics = { tokensIn: null, tokensOut: null, costUsd: null };
    // Tokens: "input: 1,000" or "input_tokens: 1000"
    const inputMatch = text.match(/(?:input(?:_tokens)?):\s*([\d,]+)/i);
    if (inputMatch)
        metrics.tokensIn = parseInt(inputMatch[1].replace(/,/g, ''), 10);
    const outputMatch = text.match(/(?:output(?:_tokens)?):\s*([\d,]+)/i);
    if (outputMatch)
        metrics.tokensOut = parseInt(outputMatch[1].replace(/,/g, ''), 10);
    // Cost: "$0.0421" or "cost: 0.0421"
    const costMatch = text.match(/(?:\$|cost:?\s*)([\d.]+)/i);
    if (costMatch)
        metrics.costUsd = parseFloat(costMatch[1]);
    return metrics;
}
export function detectEffortType(text) {
    const low = text.toLowerCase();
    if (low.includes('debug') || low.includes('fix') || low.includes('issue'))
        return 'debugging';
    if (low.includes('refactor'))
        return 'refactor';
    if (low.includes('doc') || low.includes('readme'))
        return 'documentation';
    if (low.includes('test') || low.includes('validate') || low.includes('verify'))
        return 'validation';
    if (low.includes('feat') || low.includes('add') || low.includes('build'))
        return 'feature';
    return 'validation'; // default
}
export function getThreadId(cwd = process.cwd()) {
    // 1. First check for .finn-thread file (backward compatibility)
    try {
        const fileContent = readFileSync(join(cwd, '.finn-thread'), 'utf8');
        const threadIdFromFile = fileContent.trim();
        if (threadIdFromFile) {
            // Verify thread exists in DB to avoid FK violations
            const thread = getThread(threadIdFromFile);
            if (thread)
                return threadIdFromFile;
            // If not in DB, continue to other checks
        }
    }
    catch {
        // File doesn't exist or other error - continue to GitHub check
    }
    // 2. Check for GitHub URL match
    const githubUrl = getGithubUrl(cwd);
    if (githubUrl) {
        const matchingThreadId = findThreadIdByGithubUrl(githubUrl);
        if (matchingThreadId) {
            // Verify thread still exists
            if (getThread(matchingThreadId))
                return matchingThreadId;
        }
    }
    // 3. Check for Folder Name match
    const folderName = getFolderName(cwd);
    if (folderName) {
        const matchingThreadId = findThreadIdByFolderName(folderName);
        if (matchingThreadId) {
            // Verify thread still exists
            if (getThread(matchingThreadId))
                return matchingThreadId;
        }
    }
    // 4. No thread found
    return null;
}
// Helper function to find thread ID by GitHub URL
export function findThreadIdByGithubUrl(githubUrl) {
    try {
        const sessions = listSessions({ githubUrl, limit: 1 });
        if (sessions && sessions.length > 0) {
            return sessions[0].threadId;
        }
    }
    catch (err) {
        appendHookLog(`findThreadIdByGithubUrl error: ${String(err)}`);
    }
    return null;
}
export function ensureThreadId(cwd = process.cwd()) {
    const existing = getThreadId(cwd);
    if (existing)
        return existing;
    try {
        const folderName = getFolderName(cwd) || 'Unknown Project';
        const thread = createThread({
            title: `${folderName} Development`,
            nextAction: 'Continue development',
            state: 'active',
            owner: 'you',
        });
        try {
            const threadIdFile = join(cwd, '.finn-thread');
            writeFileSync(threadIdFile, thread.id + '\n', { encoding: 'utf8' });
        }
        catch (fileErr) {
            appendHookLog(`ensureThreadId: failed to write .finn-thread file: ${String(fileErr)}`);
            // Continue anyway, we have the thread in DB
        }
        appendHookLog(`ensureThreadId: created new thread ${thread.id} for ${folderName}`);
        return thread.id;
    }
    catch (err) {
        appendHookLog(`ensureThreadId error: ${String(err)}`);
        return null;
    }
}
//# sourceMappingURL=common.js.map