import { touchThread } from '../db/threads.js';
import { appendHookLog, getThreadId } from './common.js';
export function handleGitPostCommit(cwd = process.cwd()) {
    try {
        const threadId = getThreadId(cwd);
        if (!threadId)
            return;
        touchThread(threadId);
        appendHookLog(`git-post-commit: touched thread ${threadId}`);
    }
    catch (err) {
        appendHookLog(`git-post-commit error: ${String(err)}`);
    }
}
//# sourceMappingURL=git.js.map