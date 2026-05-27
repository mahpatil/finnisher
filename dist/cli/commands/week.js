import { weekSummary, daySummary } from '../../db/summaries.js';
import { computeCompletionPct } from '../../db/completionPct.js';
function formatDateRange(from, to) {
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(from)}–${fmt(to)}, ${to.getFullYear()}`;
}
function printSummary(s, label) {
    console.log(`\n  ${label}\n`);
    console.log(`  Shipped ✓        ${s.threadsClosed} thread${s.threadsClosed !== 1 ? 's' : ''} closed`);
    console.log(`  Sessions         ${s.sessionCount}  (${s.totalHours}h tracked)`);
    console.log(`  AI cost          $${s.totalCostUsd.toFixed(2)}`);
    console.log(`  Todos checked    ${s.todosDone} / ${s.todosTotal}`);
    if (s.closestToDone.length > 0) {
        console.log(`\n  Closest to done:`);
        for (const t of s.closestToDone) {
            const pct = Math.round(computeCompletionPct(t.id) * 100);
            console.log(`    [~DONE] ${t.title} — ${pct}% complete`);
        }
    }
    if (s.stalled.length > 0) {
        console.log(`\n  Stalled (>48h):`);
        for (const t of s.stalled) {
            const hours = Math.round((Date.now() - t.updatedAt.getTime()) / 3_600_000);
            const age = hours >= 24 ? `${Math.floor(hours / 24)} days ago` : `${hours}h ago`;
            console.log(`    [STALL] ${t.title} — last touched ${age}`);
        }
    }
    console.log(`\n  ${s.motivationalLine}\n`);
}
function startOfWeek(now = new Date()) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
}
export function register(program) {
    program
        .command('week')
        .description('Weekly execution summary')
        .option('--json', 'Output as JSON')
        .action((opts) => {
        const from = startOfWeek();
        const to = new Date();
        const s = weekSummary(from, to);
        if (opts.json) {
            console.log(JSON.stringify({
                threadsClosed: s.threadsClosed,
                sessionCount: s.sessionCount,
                totalHours: s.totalHours,
                totalCostUsd: s.totalCostUsd,
                todosDone: s.todosDone,
                todosTotal: s.todosTotal,
                closestToDone: s.closestToDone.map(t => t.id),
                stalled: s.stalled.map(t => t.id),
                motivationalLine: s.motivationalLine,
            }));
            return;
        }
        printSummary(s, `Week of ${formatDateRange(from, to)}`);
    });
    program
        .command('day')
        .description('Today\'s execution summary')
        .option('--json', 'Output as JSON')
        .action((opts) => {
        const s = daySummary();
        if (opts.json) {
            console.log(JSON.stringify({
                threadsClosed: s.threadsClosed,
                sessionCount: s.sessionCount,
                totalHours: s.totalHours,
                totalCostUsd: s.totalCostUsd,
                todosDone: s.todosDone,
                todosTotal: s.todosTotal,
                closestToDone: s.closestToDone.map(t => t.id),
                stalled: s.stalled.map(t => t.id),
                motivationalLine: s.motivationalLine,
            }));
            return;
        }
        const now = new Date();
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        printSummary(s, `Today — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`);
    });
}
//# sourceMappingURL=week.js.map