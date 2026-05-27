import { and, gte, lte, sql } from 'drizzle-orm'
import { getDb } from './db.js'
import { threads, sessions, threadTodos } from './schema.js'
import type { Thread } from './schema.js'
import { listThreads, isStalled } from './threads.js'
import { computeCompletionPct } from './completionPct.js'

export interface WeekSummary {
  from: Date
  to: Date
  threadsClosed: number
  sessionCount: number
  totalHours: number
  totalCostUsd: number
  todosDone: number
  todosTotal: number
  closestToDone: Thread[]
  stalled: Thread[]
  motivationalLine: string
}

export function weekSummary(from: Date, to: Date): WeekSummary {
  const db = getDb()

  const threadsClosed = db.select({ count: sql<number>`count(*)` })
    .from(threads)
    .where(and(
      gte(threads.completedAt, from),
      lte(threads.completedAt, to)
    ))
    .get()!.count

  const sessionsInPeriod = db.select({
    count: sql<number>`count(*)`,
    totalMs: sql<number>`COALESCE(SUM(CASE WHEN ended_at IS NOT NULL THEN ended_at - started_at ELSE 0 END), 0)`,
    totalCost: sql<number>`COALESCE(SUM(cost_usd), 0)`,
  })
    .from(sessions)
    .where(and(gte(sessions.startedAt, from), lte(sessions.startedAt, to)))
    .get()!

  const todoCounts = db.select({
    done: sql<number>`COALESCE(SUM(CASE WHEN done=1 AND completed_at >= ${from.getTime()} AND completed_at <= ${to.getTime()} THEN 1 ELSE 0 END), 0)`,
    total: sql<number>`count(*)`,
  })
    .from(threadTodos)
    .get()!

  const allActive = listThreads().filter(t => t.state !== 'archived' && t.state !== 'closed')

  const closestToDone = allActive
    .map(t => ({ thread: t, pct: computeCompletionPct(t.id) }))
    .filter(x => x.pct >= 0.75)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
    .map(x => x.thread)

  const stalled = allActive.filter(t => isStalled(t))
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())

  const topSprint = closestToDone[0]
  const motivationalLine = topSprint
    ? `Ship something. You're close on ${topSprint.title}.`
    : 'Ship something.'

  return {
    from,
    to,
    threadsClosed,
    sessionCount: sessionsInPeriod.count,
    totalHours: Math.round((sessionsInPeriod.totalMs / 3_600_000) * 10) / 10,
    totalCostUsd: Math.round(sessionsInPeriod.totalCost * 100) / 100,
    todosDone: todoCounts.done,
    todosTotal: todoCounts.total,
    closestToDone,
    stalled,
    motivationalLine,
  }
}

export function daySummary(): WeekSummary {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  return weekSummary(from, new Date())
}
