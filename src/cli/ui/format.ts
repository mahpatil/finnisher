import chalk from 'chalk'
import type { ThreadState, AgentType } from '../../db/schema.js'
import type { FocusWarning } from '../../db/threads.js'
import type { Thread } from '../../db/schema.js'

const STATE_COLORS: Record<ThreadState, (s: string) => string> = {
  active:  chalk.green,
  waiting: chalk.yellow,
  blocked: chalk.red,
  done:    chalk.gray,
}

const AGENT_LABELS: Record<string, string> = {
  claude_code: 'Claude',
  codex: 'Codex',
  opencode: 'OpenCode',
  gemini_code: 'Gemini',
  manual: 'Manual',
}

export function agentLabel(agent: string): string {
  return AGENT_LABELS[agent] ?? agent
}

export function stateBadge(state: ThreadState): string {
  const colorFn = STATE_COLORS[state] ?? chalk.white
  return colorFn(state)
}

export function stalledBadge(): string {
  return chalk.red('⚠ STALLED')
}

export function durationStr(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return '<1m'
}

export function costStr(usd: number | null): string {
  if (usd === null || usd === undefined) return '—'
  return `$${usd.toFixed(2)}`
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
  if (diffDays >= 1) return `${diffDays}d ago`
  if (diffHours >= 1) return `${diffHours}h ago`
  return 'just now'
}

function suggestionLine(t: Thread, isStalled: boolean): string {
  const stalledNote = isStalled ? '  (stalled)' : ''
  const lastTouched = relativeTime(t.updatedAt)
  return `  → ${t.id}  "${t.title}"  last touched ${lastTouched}${stalledNote}`
}

export function printFocusWarning(w: FocusWarning): void {
  const icon = w.level === 'urgent' ? '⛔' : '⚠'
  const headerFn = w.level === 'urgent' ? chalk.red : chalk.yellow
  console.log('')
  console.log(headerFn(`${icon}  ${w.count} active threads — ${w.level === 'urgent' ? 'focus is critically scattered. Finish or park these first:' : 'above the 5-thread focus ideal. Consider closing these:'}`))
  console.log('')
  const now = Date.now()
  for (const t of w.suggestions) {
    const stalled = t.state !== 'done' && now - t.updatedAt.getTime() > 48 * 60 * 60 * 1000
    console.log(headerFn(suggestionLine(t, stalled)))
  }
  console.log('')
  console.log(headerFn('  Run: finn done <id>   or   finn status <id> waiting'))
}
