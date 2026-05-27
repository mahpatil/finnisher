import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finn-pct-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  vi.resetModules()
  const { runMigrations } = await import('../db/migrate.js')
  runMigrations()
  const { createThread } = await import('../db/threads.js')
  const thread = createThread({ title: 'Test', nextAction: 'x', state: 'open', owner: 'you' })
  const { computeCompletionPct } = await import('../db/completionPct.js')
  const { getSqlite } = await import('../db/db.js')
  return { thread, computeCompletionPct, getSqlite }
}

async function addOpenBlocker(threadId: string, getSqlite: Awaited<ReturnType<typeof setup>>['getSqlite']) {
  getSqlite().prepare(
    "INSERT INTO blockers (id, thread_id, description, status, created_at) VALUES (?,?,?,?,?)"
  ).run('b_open_' + randomBytes(2).toString('hex'), threadId, 'Blocking issue', 'critical', Date.now())
}

afterEach(async () => {
  const { _resetDb } = await import('../db/db.js')
  _resetDb()
  vi.resetModules()
  delete process.env['FINNISHER_DB_PATH']
})

describe('computeCompletionPct', () => {
  it('returns 0 when thread has an open blocker and no todos, sessions, or criteria', async () => {
    const { thread, computeCompletionPct, getSqlite } = await setup()
    await addOpenBlocker(thread.id, getSqlite)
    expect(computeCompletionPct(thread.id)).toBe(0)
  })

  it('adds 0.4 from todos when all todos are done (open blocker to isolate term)', async () => {
    const { thread, computeCompletionPct, getSqlite } = await setup()
    await addOpenBlocker(thread.id, getSqlite)
    const { createTodo } = await import('../db/todos.js')
    const t1 = createTodo(thread.id, 'Task 1')
    const t2 = createTodo(thread.id, 'Task 2')
    getSqlite().prepare('UPDATE thread_todos SET done=1 WHERE id IN (?,?)').run(t1.id, t2.id)
    expect(computeCompletionPct(thread.id)).toBeCloseTo(0.4, 2)
  })

  it('adds 0.2 from sessions when 3+ sessions in last 7 days (open blocker to isolate term)', async () => {
    const { thread, computeCompletionPct, getSqlite } = await setup()
    await addOpenBlocker(thread.id, getSqlite)
    const { createSession } = await import('../db/sessions.js')
    for (let i = 0; i < 3; i++) {
      createSession({ agent: 'claude_code', startedAt: new Date(), threadId: thread.id, projectPath: '/tmp' })
    }
    expect(computeCompletionPct(thread.id)).toBeCloseTo(0.2, 2)
  })

  it('adds 0.2 from blockers term when zero open blockers (only resolved blocker)', async () => {
    const { thread, computeCompletionPct, getSqlite } = await setup()
    getSqlite().prepare(
      "INSERT INTO blockers (id, thread_id, description, status, created_at) VALUES (?,?,?,?,?)"
    ).run('b1', thread.id, 'Resolved issue', 'resolved', Date.now())
    expect(computeCompletionPct(thread.id)).toBeCloseTo(0.2, 2)
  })

  it('adds 0.2 from criteria when all criteria are checked (open blocker to isolate term)', async () => {
    const { thread, computeCompletionPct, getSqlite } = await setup()
    await addOpenBlocker(thread.id, getSqlite)
    const { addLaunchCriterion, toggleLaunchCriterion } = await import('../db/launchCriteria.js')
    const c = addLaunchCriterion(thread.id, 'Deploy')
    toggleLaunchCriterion(c.id, true)
    expect(computeCompletionPct(thread.id)).toBeCloseTo(0.2, 2)
  })

  it('returns 1.0 when todos all done, 3+ sessions, no open blockers, all criteria checked', async () => {
    const { thread, computeCompletionPct, getSqlite } = await setup()
    const { createTodo } = await import('../db/todos.js')
    const todo = createTodo(thread.id, 'Ship it')
    getSqlite().prepare('UPDATE thread_todos SET done=1 WHERE id=?').run(todo.id)
    const { createSession } = await import('../db/sessions.js')
    for (let i = 0; i < 3; i++) {
      createSession({ agent: 'claude_code', startedAt: new Date(), threadId: thread.id, projectPath: '/tmp' })
    }
    const { addLaunchCriterion, toggleLaunchCriterion } = await import('../db/launchCriteria.js')
    const c = addLaunchCriterion(thread.id, 'Deploy')
    toggleLaunchCriterion(c.id, true)
    expect(computeCompletionPct(thread.id)).toBeCloseTo(1.0, 2)
  })

  it('does not exceed 1.0', async () => {
    const { thread, computeCompletionPct, getSqlite } = await setup()
    const { createTodo } = await import('../db/todos.js')
    const todo = createTodo(thread.id, 'Task')
    getSqlite().prepare('UPDATE thread_todos SET done=1 WHERE id=?').run(todo.id)
    const { createSession } = await import('../db/sessions.js')
    for (let i = 0; i < 10; i++) {
      createSession({ agent: 'claude_code', startedAt: new Date(), threadId: thread.id, projectPath: '/tmp' })
    }
    expect(computeCompletionPct(thread.id)).toBeLessThanOrEqual(1.0)
  })
})
