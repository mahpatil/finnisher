import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-api-todos-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init)
}

async function setup() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  vi.resetModules()
  const { runMigrations } = await import('@db/migrate')
  runMigrations()
  const { createThread } = await import('@db/threads')
  const thread = createThread({ title: 'Test Thread', nextAction: 'Do something', state: 'open', owner: 'you' })
  const threadTodosRoute = await import('../threads/[id]/todos/route.js')
  const todosIdRoute = await import('../todos/[id]/route.js')
  return { threadTodosRoute, todosIdRoute, thread }
}

afterEach(async () => {
  const { _resetDb } = await import('@db/db')
  _resetDb()
  vi.resetModules()
})

// ── POST /api/threads/:id/todos ───────────────────────────────────────────────

describe('POST /api/threads/:id/todos', () => {
  it('creates a todo and returns 201 with todo object', async () => {
    const { threadTodosRoute, thread } = await setup()
    const res = await threadTodosRoute.POST(
      makeRequest(`http://localhost/api/threads/${thread.id}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Write unit tests' }),
      }),
      { params: Promise.resolve({ id: thread.id }) }
    )
    expect(res.status).toBe(201)
    const body = await res.json() as { todo: { id: string; threadId: string; text: string; done: boolean; createdAt: string } }
    expect(body.todo.id).toHaveLength(10)
    expect(body.todo.threadId).toBe(thread.id)
    expect(body.todo.text).toBe('Write unit tests')
    expect(body.todo.done).toBe(false)
    expect(body.todo.createdAt).toBeDefined()
  })

  it('returns 422 when text is empty or whitespace-only', async () => {
    const { threadTodosRoute, thread } = await setup()
    const res = await threadTodosRoute.POST(
      makeRequest(`http://localhost/api/threads/${thread.id}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '   ' }),
      }),
      { params: Promise.resolve({ id: thread.id }) }
    )
    expect(res.status).toBe(422)
    const body = await res.json() as { error: { code: string; message: string } }
    expect(body.error.code).toBe('INVALID_INPUT')
  })

  it('returns 404 when thread does not exist', async () => {
    const { threadTodosRoute } = await setup()
    const res = await threadTodosRoute.POST(
      makeRequest('http://localhost/api/threads/notfound/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Test' }),
      }),
      { params: Promise.resolve({ id: 'notfound' }) }
    )
    expect(res.status).toBe(404)
  })
})

// ── GET /api/threads/:id/todos ────────────────────────────────────────────────

describe('GET /api/threads/:id/todos', () => {
  it('returns todos ordered by createdAt ascending', async () => {
    const { threadTodosRoute, thread } = await setup()
    const { createTodo } = await import('@db/todos')
    createTodo(thread.id, 'First')
    createTodo(thread.id, 'Second')
    const res = await threadTodosRoute.GET(
      makeRequest(`http://localhost/api/threads/${thread.id}/todos`),
      { params: Promise.resolve({ id: thread.id }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { todos: Array<{ text: string }> }
    expect(body.todos).toHaveLength(2)
    expect(body.todos[0].text).toBe('First')
    expect(body.todos[1].text).toBe('Second')
  })

  it('returns empty array when thread has no todos', async () => {
    const { threadTodosRoute, thread } = await setup()
    const res = await threadTodosRoute.GET(
      makeRequest(`http://localhost/api/threads/${thread.id}/todos`),
      { params: Promise.resolve({ id: thread.id }) }
    )
    const body = await res.json() as { todos: unknown[] }
    expect(body.todos).toEqual([])
  })

  it('returns 404 when thread does not exist', async () => {
    const { threadTodosRoute } = await setup()
    const res = await threadTodosRoute.GET(
      makeRequest('http://localhost/api/threads/notfound/todos'),
      { params: Promise.resolve({ id: 'notfound' }) }
    )
    expect(res.status).toBe(404)
  })
})

// ── PATCH /api/todos/:id ──────────────────────────────────────────────────────

describe('PATCH /api/todos/:id', () => {
  it('toggles done to true and returns updated todo', async () => {
    const { todosIdRoute, thread } = await setup()
    const { createTodo } = await import('@db/todos')
    const todo = createTodo(thread.id, 'Do something')
    const res = await todosIdRoute.PATCH(
      makeRequest(`http://localhost/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: true }),
      }),
      { params: Promise.resolve({ id: todo.id }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { todo: { done: boolean } }
    expect(body.todo.done).toBe(true)
  })

  it('updates todo text', async () => {
    const { todosIdRoute, thread } = await setup()
    const { createTodo } = await import('@db/todos')
    const todo = createTodo(thread.id, 'Old text')
    const res = await todosIdRoute.PATCH(
      makeRequest(`http://localhost/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'New text' }),
      }),
      { params: Promise.resolve({ id: todo.id }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { todo: { text: string } }
    expect(body.todo.text).toBe('New text')
  })

  it('returns 422 when text is empty', async () => {
    const { todosIdRoute, thread } = await setup()
    const { createTodo } = await import('@db/todos')
    const todo = createTodo(thread.id, 'Old text')
    const res = await todosIdRoute.PATCH(
      makeRequest(`http://localhost/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '' }),
      }),
      { params: Promise.resolve({ id: todo.id }) }
    )
    expect(res.status).toBe(422)
  })

  it('returns 404 when todo does not exist', async () => {
    const { todosIdRoute } = await setup()
    const res = await todosIdRoute.PATCH(
      makeRequest('http://localhost/api/todos/notfound', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: true }),
      }),
      { params: Promise.resolve({ id: 'notfound' }) }
    )
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/todos/:id ─────────────────────────────────────────────────────

describe('DELETE /api/todos/:id', () => {
  it('deletes the todo and returns 204', async () => {
    const { todosIdRoute, thread } = await setup()
    const { createTodo } = await import('@db/todos')
    const todo = createTodo(thread.id, 'Delete me')
    const res = await todosIdRoute.DELETE(
      makeRequest(`http://localhost/api/todos/${todo.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: todo.id }) }
    )
    expect(res.status).toBe(204)
  })

  it('returns 404 when todo does not exist', async () => {
    const { todosIdRoute } = await setup()
    const res = await todosIdRoute.DELETE(
      makeRequest('http://localhost/api/todos/notfound', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'notfound' }) }
    )
    expect(res.status).toBe(404)
  })
})

// ── GET /api/threads includes todoDone / todoTotal ────────────────────────────

describe('GET /api/threads includes todo counts', () => {
  it('returns todoDone and todoTotal for each thread', async () => {
    process.env['FINNISHER_DB_PATH'] = tempDbPath()
    vi.resetModules()
    const { runMigrations } = await import('@db/migrate')
    runMigrations()
    const { createThread } = await import('@db/threads')
    const thread = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const { createTodo, updateTodo } = await import('@db/todos')
    const t1 = createTodo(thread.id, 'Item 1')
    createTodo(thread.id, 'Item 2')
    updateTodo(t1.id, { done: true })
    const { GET } = await import('../threads/route.js')
    const res = GET(makeRequest('http://localhost/api/threads'))
    const body = await res.json() as { threads: Array<{ id: string; todoDone: number; todoTotal: number }> }
    const t = body.threads.find(x => x.id === thread.id)!
    expect(t.todoDone).toBe(1)
    expect(t.todoTotal).toBe(2)
  })
})
