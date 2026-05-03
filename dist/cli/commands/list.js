import Table from 'cli-table3';
import { listThreads, isStalled, overloadWarning } from '../../db/threads.js';
import { stateBadge, stalledBadge, printFocusWarning } from '../ui/format.js';
const VALID_STATES = ['active', 'waiting', 'blocked', 'done'];
function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
function relativeDate(date) {
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffDays >= 1)
        return `${diffDays}d ago`;
    if (diffHours >= 1)
        return `${diffHours}h ago`;
    return 'just now';
}
function sortThreads(ts) {
    const order = { active: 0, waiting: 1, blocked: 2, done: 3 };
    return [...ts].sort((a, b) => {
        const orderDiff = order[a.state] - order[b.state];
        if (orderDiff !== 0)
            return orderDiff;
        return a.updatedAt.getTime() - b.updatedAt.getTime();
    });
}
export function register(program) {
    program
        .command('list')
        .description('List threads')
        .option('--state <state>', 'Filter by state')
        .action((opts) => {
        const all = listThreads();
        const stateFilter = opts.state;
        if (stateFilter && !VALID_STATES.includes(stateFilter)) {
            console.error(`Error: Invalid state "${stateFilter}". Valid states: ${VALID_STATES.join(', ')}`);
            process.exitCode = 1;
            process.exit();
        }
        const filtered = stateFilter
            ? all.filter(t => t.state === stateFilter)
            : all.filter(t => t.state !== 'done');
        const warning = overloadWarning(all);
        if (warning)
            printFocusWarning(warning);
        const table = new Table({
            head: ['ID', 'Title', 'State', 'Owner', 'Next Action', 'Updated', '⚠'],
            colWidths: [12, 37, 10, 10, 42, 12, 14],
            style: { head: ['cyan'] },
        });
        const sorted = sortThreads(filtered);
        for (const t of sorted) {
            const stalled = isStalled(t);
            table.push([
                t.id,
                truncate(t.title, 35),
                stateBadge(t.state),
                t.owner,
                truncate(t.nextAction, 40),
                relativeDate(t.updatedAt),
                stalled ? stalledBadge() : '',
            ]);
        }
        console.log(table.toString());
        const stalledCount = all.filter(t => isStalled(t)).length;
        console.log(`${stalledCount} stalled`);
    });
}
//# sourceMappingURL=list.js.map