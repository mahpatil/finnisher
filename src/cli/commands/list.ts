import type { Command } from 'commander'
import Table from 'cli-table3'
import { listThreads, isStalled, overloadWarning } from '../../db/threads.js'
import { THREAD_STATES, THREAD_PRIORITIES } from '../../db/schema.js'
import type { Thread, ThreadState, ThreadPriority } from '../../db/schema.js'
import { stateBadge, stalledBadge, printFocusWarning } from '../ui/format.js'
import { isLaunchReady } from '../../db/launchCriteria.js'

const STATE_ORDER: Record<ThreadState, number> = {
  new: 0, open: 1, waiting: 2, blocked: 3, closed: 4, archived: 5,
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

function relativeDate(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
  if (diffDays >= 1) return `${diffDays}d ago`
  if (diffHours >= 1) return `${diffHours}h ago`
  return 'just now'
}

function sortThreads(ts: Thread[]): Thread[] {
  return [...ts].sort((a, b) => {
    const orderDiff = STATE_ORDER[a.state] - STATE_ORDER[b.state]
    if (orderDiff !== 0) return orderDiff
    return a.updatedAt.getTime() - b.updatedAt.getTime()
  })
}

export function register(program: Command): void {
  program
    .command('list')
    .description('List threads')
    .option('--state <state>', 'Filter by state')
    .option('--archived', 'Show only archived threads')
    .option('--priority <priority>', 'Filter by priority')
    .action((opts: { state?: string; archived?: boolean; priority?: string }) => {
      const all = listThreads()

      const stateFilter = opts.state as ThreadState | undefined
      if (stateFilter && !THREAD_STATES.includes(stateFilter)) {
        console.error(`Error: Invalid state "${stateFilter}". Valid states: ${THREAD_STATES.join(', ')}`)
        process.exitCode = 1
        process.exit()
      }

      const priorityFilter = opts.priority as ThreadPriority | undefined
      if (priorityFilter && !THREAD_PRIORITIES.includes(priorityFilter)) {
        console.error(`Error: Invalid priority "${priorityFilter}". Valid: ${THREAD_PRIORITIES.join(', ')}`)
        process.exitCode = 1
        process.exit()
      }

      let filtered: Thread[]
      if (opts.archived) {
        filtered = all.filter(t => t.state === 'archived')
      } else if (stateFilter) {
        filtered = all.filter(t => t.state === stateFilter)
      } else {
        filtered = all.filter(t => t.state !== 'archived')
      }

      if (priorityFilter) {
        filtered = filtered.filter(t => t.priority === priorityFilter)
      }

      const warning = overloadWarning(all)
      if (warning) printFocusWarning(warning)

      const table = new Table({
        head: ['ID', 'Title', 'State', 'Priority', 'Owner', 'Next Action', 'Updated', '⚠'],
        colWidths: [12, 32, 10, 10, 10, 37, 12, 14],
        style: { head: ['cyan'] },
      })

      const sorted = sortThreads(filtered)
      for (const t of sorted) {
        const stalled = isStalled(t)
        const ready = isLaunchReady(t.id)
        const statusBadge = ready ? '[READY]' : stalled ? stalledBadge() : ''
        table.push([
          t.id,
          truncate(t.title, 30),
          stateBadge(t.state),
          t.priority,
          t.owner,
          truncate(t.nextAction, 35),
          relativeDate(t.updatedAt),
          statusBadge,
        ])
      }

      console.log(table.toString())

      const stalledCount = all.filter(t => isStalled(t)).length
      console.log(`${stalledCount} stalled`)
    })
}
