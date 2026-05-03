import Table from 'cli-table3';
import { listSessions } from '../../db/sessions.js';
import { durationStr, costStr } from '../ui/format.js';
function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
function formatStarted(date) {
    return date.toLocaleString();
}
export function register(program) {
    program
        .command('sessions')
        .description('List recent sessions')
        .option('--thread <id>', 'Filter by thread ID')
        .action((opts) => {
        const all = listSessions({ threadId: opts.thread, limit: 20 });
        const table = new Table({
            head: ['ID', 'Agent', 'Thread', 'Started', 'Duration', 'Tokens In', 'Tokens Out', 'Cost', 'Branch', 'Last Commit', 'Unpushed', 'Folder', 'Repo'],
            style: { head: ['cyan'] },
        });
        for (const s of all) {
            const duration = s.endedAt
                ? durationStr(s.endedAt.getTime() - s.startedAt.getTime())
                : 'running';
            const lastCommit = s.lastCommitMsg
                ? truncate(s.lastCommitMsg, 30)
                : '—';
            const repo = s.githubUrl
                ? truncate(s.githubUrl, 30)
                : '—';
            table.push([
                s.id,
                s.agent,
                s.threadId ?? '—',
                formatStarted(s.startedAt),
                duration,
                s.tokensIn?.toString() ?? '—',
                s.tokensOut?.toString() ?? '—',
                costStr(s.costUsd ?? null),
                s.gitBranch ?? '—',
                lastCommit,
                s.unpushedCount?.toString() ?? '—',
                s.folderName ?? '—',
                repo,
            ]);
        }
        console.log(table.toString());
    });
}
//# sourceMappingURL=sessions.js.map