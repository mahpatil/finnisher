import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finn-summary-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  vi.resetModules()
  const { runMigrations } = await import('../db/migrate.js')
  runMigrations()
  const { createThread, updateState } = await import('../db/threads.js')
  const { createSession } = await import('../db/sessions.js')
  const { createTodo } = await import('../db/todos.js')
  const { getSqlite } = await import('../db/db.js')
  const { weekSummary } = await import('../db/summaries.js')
  return { createThread, updateState, createSession, createTodo, getSqlite, weekSummary }
}

afterEach(async () => {
  const { _resetDb } = await import('../db/db.js')
  _resetDb()
  vi.resetModules()
  delete process.env['FINNISHER_DB_PATH']
})

function startOfWeek(now = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

describe('weekSummary', () => {
  it('returns zeros when nothing exists in the period', async () => {
    const { weekSummary } = await setup()
    const from = startOfWeek()
    const to = new Date()
    const s = weekSummary(from, to)
    expect(s.threadsClosed).toBe(0)
    expect(s.sessionCount).toBe(0)
    expect(s.totalHours).toBe(0)
    expect(s.totalCostUsd).toBe(0)
    expect(s.todosDone).toBe(0)
    expect(s.todosTotal).toBe(0)
    expect(s.closestToDone).toEqual([])
    expect(s.stalled).toEqual([])
  })

  it('counts closed threads in period', async () => {
    const { createThread, updateState, weekSummary } = await setup()
    const t1 = createThread({ title: 'T1', nextAction: 'N', state: 'open', owner: 'you' })
    const t2 = createThread({ title: 'T2', nextAction: 'N', state: 'open', owner: 'you' })
    updateState(t1.id, 'closed')
    updateState(t2.id, 'closed')
    const from = startOfWeek()
    const to = new Date(Date.now() + 60000)
    const s = weekSummary(from, to)
    expect(s.threadsClosed).toBe(2)
  })

  it('counts sessions and sums hours and cost in period', async () => {
    const { createSession, weekSummary } = await setup()
    const now = Date.now()
    createSession({ agent: 'claude_code', startedAt: new Date(now - 7_200_000), endedAt: new Date(now - 3_600_000), costUsd: 1.5 })
    createSession({ agent: 'claude_code', startedAt: new Date(now - 3_600_000), endedAt: new Date(now), costUsd: 0.75 })
    const from = new Date(now - 86_400_000)
    const to = new Date(now + 60000)
    const s = weekSummary(from, to)
    expect(s.sessionCount).toBe(2)
    expect(s.totalHours).toBeCloseTo(2, 0)
    expect(s.totalCostUsd).toBeCloseTo(2.25, 2)
  })

  it('counts todos done in period', async () => {
    const { createThread, createTodo, getSqlite, weekSummary } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const todo1 = createTodo(t.id, 'Task 1')
    const todo2 = createTodo(t.id, 'Task 2')
    createTodo(t.id, 'Task 3')
    const now = Date.now()
    getSqlite().prepare('UPDATE thread_todos SET done=1, completed_at=? WHERE id IN (?,?)').run(now - 1000, todo1.id, todo2.id)
    const from = new Date(now - 86_400_000)
    const to = new Date(now + 60000)
    const s = weekSummary(from, to)
    expect(s.todosDone).toBe(2)
    expect(s.todosTotal).toBe(3)
  })

  it('includes closestToDone threads with completionPct >= 0.75', async () => {
    const { createThread, createTodo, createSession, getSqlite, weekSummary } = await setup()
    const t = createThread({ title: 'Sprint', nextAction: 'Ship', state: 'open', owner: 'you' })
    const todo = createTodo(t.id, 'Task')
    getSqlite().prepare('UPDATE thread_todos SET done=1 WHERE id=?').run(todo.id)
    for (let i = 0; i < 3; i++) {
      createSession({ agent: 'claude_code', startedAt: new Date(), threadId: t.id, projectPath: '/tmp' })
    }
    const from = startOfWeek()
    const to = new Date(Date.now() + 60000)
    const s = weekSummary(from, to)
    expect(s.closestToDone.some(c => c.id === t.id)).toBe(true)
  })

  it('includes stalled threads', async () => {
    const { createThread, getSqlite, weekSummary } = await setup()
    const t = createThread({ title: 'Stalled', nextAction: 'N', state: 'open', owner: 'you' })
    getSqlite().prepare('UPDATE threads SET updated_at=? WHERE id=?').run(Date.now() - 49 * 3600 * 1000, t.id)
    const from = startOfWeek()
    const to = new Date(Date.now() + 60000)
    const s = weekSummary(from, to)
    expect(s.stalled.some(st => st.id === t.id)).toBe(true)
  })
})
