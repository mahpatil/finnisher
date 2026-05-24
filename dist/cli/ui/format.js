import chalk from 'chalk';
const STATE_COLORS = {
    new: chalk.cyan,
    open: chalk.green,
    waiting: chalk.yellow,
    blocked: chalk.red,
    closed: chalk.gray,
    archived: chalk.dim,
};
const AGENT_LABELS = {
    claude_code: 'Claude',
    codex: 'Codex',
    opencode: 'OpenCode',
    gemini_code: 'Gemini',
    manual: 'Manual',
};
export function agentLabel(agent) {
    return AGENT_LABELS[agent] ?? agent;
}
export function stateBadge(state) {
    const colorFn = STATE_COLORS[state] ?? chalk.white;
    return colorFn(state);
}
export function stalledBadge() {
    return chalk.red('⚠ STALLED');
}
export function durationStr(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0)
        return `${hours}h ${minutes}m`;
    if (minutes > 0)
        return `${minutes}m`;
    return '<1m';
}
export function costStr(usd) {
    if (usd === null || usd === undefined)
        return '—';
    return `$${usd.toFixed(2)}`;
}
function relativeTime(date) {
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffDays >= 1)
        return `${diffDays}d ago`;
    if (diffHours >= 1)
        return `${diffHours}h ago`;
    return 'just now';
}
function suggestionLine(t, isStalled) {
    const stalledNote = isStalled ? '  (stalled)' : '';
    const lastTouched = relativeTime(t.updatedAt);
    return `  → ${t.id}  "${t.title}"  last touched ${lastTouched}${stalledNote}`;
}
export function printFocusWarning(w) {
    const icon = w.level === 'urgent' ? '⛔' : '⚠';
    const headerFn = w.level === 'urgent' ? chalk.red : chalk.yellow;
    console.log('');
    console.log(headerFn(`${icon}  ${w.count} active threads — ${w.level === 'urgent' ? 'focus is critically scattered. Finish or park these first:' : 'above the 5-thread focus ideal. Consider closing these:'}`));
    console.log('');
    const now = Date.now();
    for (const t of w.suggestions) {
        const stalled = t.state !== 'closed' && t.state !== 'archived' && now - t.updatedAt.getTime() > 48 * 60 * 60 * 1000;
        console.log(headerFn(suggestionLine(t, stalled)));
    }
    console.log('');
    console.log(headerFn('  Run: finn done <id>   or   finn status <id> waiting   or   finn archive <id>'));
}
//# sourceMappingURL=format.js.map