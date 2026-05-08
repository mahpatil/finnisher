import { handleClaudeStart, handleClaudeStop } from '../../hooks/claude-code.js';
import { handleCodexStop } from '../../hooks/codex.js';
import { handleOpencodeStart, handleOpencodeStop } from '../../hooks/opencode.js';
import { handleGeminiStart, handleGeminiStop } from '../../hooks/gemini.js';
import { handleGitPostCommit } from '../../hooks/git.js';
import { appendHookLog } from '../../hooks/common.js';
const EVENTS = [
    'claude-pre-tool-use',
    'claude-stop',
    'codex-stop',
    'opencode-start',
    'opencode-stop',
    'gemini-start',
    'gemini-stop',
    'git-post-commit',
];
function readStdin() {
    return new Promise(resolve => {
        if (process.stdin.isTTY) {
            resolve('');
            return;
        }
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => { data += String(chunk); });
        process.stdin.on('end', () => resolve(data.trim()));
        process.stdin.on('error', () => resolve(''));
    });
}
export function register(program) {
    program
        .command('hook <event>')
        .description('Internal hook dispatcher — called by agent hooks')
        .option('--stdin <json>', 'JSON payload (overrides process.stdin)')
        .option('--cwd <path>', 'Working directory override')
        .action(async (event, opts) => {
        const cwd = opts.cwd ?? process.cwd();
        const needsStdin = event === 'claude-stop' || event === 'opencode-stop' || event === 'gemini-stop';
        const raw = opts.stdin ?? (needsStdin ? await readStdin() : '');
        if (!EVENTS.includes(event)) {
            appendHookLog(`hook: unknown event "${event}"`);
            return;
        }
        switch (event) {
            case 'claude-pre-tool-use':
                handleClaudeStart(null, cwd);
                break;
            case 'claude-stop':
                handleClaudeStop(raw, cwd);
                break;
            case 'codex-stop':
                handleCodexStop(cwd);
                break;
            case 'opencode-start':
                handleOpencodeStart(cwd);
                break;
            case 'opencode-stop':
                handleOpencodeStop(raw, cwd);
                break;
            case 'gemini-start':
                handleGeminiStart(null, cwd);
                break;
            case 'gemini-stop':
                handleGeminiStop(raw, cwd);
                break;
            case 'git-post-commit':
                handleGitPostCommit(cwd);
                break;
        }
    });
}
//# sourceMappingURL=hook.js.map