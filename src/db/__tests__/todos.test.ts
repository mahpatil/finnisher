import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-todos-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  vi.resetModules()
  const { runMigrations } = await import('../migrate.js')
  runMigrations()
  const { createThread } = await import('../threads.js')
  const thread = createThread({ title: 'Test Thread', nextAction: 'Do something', state: 'open', owner: 'you' })
  const todos = await import('../todos.js')
  return { todos, thread }
}

afterEach(async () => {
  const { _resetDb } = await import('../db.js')
  _resetDb()
  vi.resetModules()
})

describe('createTodo', () => {
  it('creates a todo with correct fields', async () => {
    const { todos, thread } = await setup()
    const todo = todos.createTodo(thread.id, 'Write unit tests')
    expect(todo.id).toHaveLength(10)
    expect(todo.threadId).toBe(thread.id)
    expect(todo.text).toBe('Write unit tests')
    expect(todo.done).toBe(false)
    expect(todo.createdAt).toBeInstanceOf(Date)
    expect(todo.completedAt).toBeNull()
  })
})

describe('listTodos', () => {
  it('returns todos for a thread ordered by createdAt ascending', async () => {
    const { todos, thread } = await setup()
    todos.createTodo(thread.id, 'First')
    todos.createTodo(thread.id, 'Second')
    const list = todos.listTodos(thread.id)
    expect(list).toHaveLength(2)
    expect(list[0].text).toBe('First')
    expect(list[1].text).toBe('Second')
  })

  it('returns empty array when thread has no todos', async () => {
    const { todos, thread } = await setup()
    expect(todos.listTodos(thread.id)).toEqual([])
  })
})

describe('updateTodo', () => {
  it('marks todo as done and sets completedAt', async () => {
    const { todos, thread } = await setup()
    const todo = todos.createTodo(thread.id, 'Do a thing')
    const updated = todos.updateTodo(todo.id, { done: true })
    expect(updated.done).toBe(true)
    expect(updated.completedAt).toBeInstanceOf(Date)
  })

  it('unmarks a done todo and clears completedAt', async () => {
    const { todos, thread } = await setup()
    const todo = todos.createTodo(thread.id, 'Do a thing')
    todos.updateTodo(todo.id, { done: true })
    const updated = todos.updateTodo(todo.id, { done: false })
    expect(updated.done).toBe(false)
    expect(updated.completedAt).toBeNull()
  })

  it('updates todo text', async () => {
    const { todos, thread } = await setup()
    const todo = todos.createTodo(thread.id, 'Old text')
    const updated = todos.updateTodo(todo.id, { text: 'New text' })
    expect(updated.text).toBe('New text')
  })

  it('throws when todo does not exist', async () => {
    const { todos } = await setup()
    expect(() => todos.updateTodo('nonexistent', { done: true })).toThrow()
  })
})

describe('deleteTodo', () => {
  it('removes the todo so it no longer appears in list', async () => {
    const { todos, thread } = await setup()
    const todo = todos.createTodo(thread.id, 'Delete me')
    todos.deleteTodo(todo.id)
    expect(todos.listTodos(thread.id)).toHaveLength(0)
  })
})

describe('listTodoCounts', () => {
  it('returns done and total counts keyed by thread id', async () => {
    const { todos, thread } = await setup()
    const t1 = todos.createTodo(thread.id, 'Item 1')
    todos.createTodo(thread.id, 'Item 2')
    todos.updateTodo(t1.id, { done: true })
    const counts = todos.listTodoCounts([thread.id])
    expect(counts[thread.id]).toEqual({ done: 1, total: 2 })
  })

  it('returns zeros for a thread with no todos', async () => {
    const { todos, thread } = await setup()
    const counts = todos.listTodoCounts([thread.id])
    expect(counts[thread.id]).toEqual({ done: 0, total: 0 })
  })
})
