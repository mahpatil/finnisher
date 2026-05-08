import { execSync } from 'child_process';
import { basename, join } from 'path';
import { appendFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
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
    const sshMatch = url.match(/^git@github\\.com:(.+?)(?:\\.git)?$/);
    if (sshMatch)
        return `https://github.com/${sshMatch[1]}`;
    // HTTPS: must be github.com
    if (!url.includes('github.com'))
        return null;
    // Strip trailing .git
    url = url.replace(/\\.git$/, '');
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
export function getThreadId(cwd = process.cwd()) {
    // 1. First check for .finn-thread file (backward compatibility)
    try {
        const fileContent = readFileSync(join(cwd, '.finn-thread'), 'utf8');
        const threadIdFromFile = fileContent.trim();
        if (threadIdFromFile) {
            // Return thread ID from file even if not verified in DB
            // (allows for creating thread later)
            return threadIdFromFile;
        }
    }
    catch {
        // File doesn't exist or other error - continue to GitHub check
    }
    // 2. Check for GitHub URL match
    const githubUrl = getGithubUrl(cwd);
    if (githubUrl) {
        const matchingThreadId = findThreadIdByGithubUrl(githubUrl);
        if (matchingThreadId)
            return matchingThreadId;
    }
    // 3. No thread found
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
//# sourceMappingURL=common.js.map