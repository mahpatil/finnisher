import { and, count, eq, gte, ne, sql } from 'drizzle-orm'
import { getDb } from './db.js'
import { threadTodos, sessions, blockers, launchCriteria } from './schema.js'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const SESSION_THRESHOLD = 3

export function computeCompletionPct(threadId: string): number {
  const db = getDb()

  const todosRow = db
    .select({
      total: count(),
      done: sql<number>`COALESCE(SUM(CASE WHEN ${threadTodos.done} = 1 THEN 1 ELSE 0 END), 0)`,
    })
    .from(threadTodos)
    .where(eq(threadTodos.threadId, threadId))
    .get()
  const todosTotal = todosRow?.total ?? 0
  const todosDone = Number(todosRow?.done ?? 0)
  const todosTerm = todosTotal > 0 ? (todosDone / todosTotal) * 0.4 : 0

  const recentRow = db
    .select({ n: count() })
    .from(sessions)
    .where(
      and(
        eq(sessions.threadId, threadId),
        gte(sessions.startedAt, new Date(Date.now() - SEVEN_DAYS_MS)),
      ),
    )
    .get()
  const recentSessions = recentRow?.n ?? 0
  const sessionsTerm = recentSessions >= SESSION_THRESHOLD ? 0.2 : 0

  const blockersRow = db
    .select({ n: count() })
    .from(blockers)
    .where(
      and(
        eq(blockers.threadId, threadId),
        ne(blockers.status, 'resolved'),
      ),
    )
    .get()
  const openBlockers = blockersRow?.n ?? 0
  const blockersTerm = openBlockers === 0 ? 0.2 : 0

  const criteriaRow = db
    .select({ total: count(), checked: count(launchCriteria.checkedAt) })
    .from(launchCriteria)
    .where(eq(launchCriteria.threadId, threadId))
    .get()
  const criteriaTotal = criteriaRow?.total ?? 0
  const criteriaMet = criteriaRow?.checked ?? 0
  const criteriaTerm = criteriaTotal > 0 ? (criteriaMet / criteriaTotal) * 0.2 : 0

  const raw = todosTerm + sessionsTerm + blockersTerm + criteriaTerm
  return Math.min(1, Math.round(raw * 100) / 100)
}
