import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { getThread } from '@db/threads'
import { createTodo, listTodos } from '@db/todos'

runMigrations()

function serializeTodo(todo: ReturnType<typeof createTodo>) {
  return {
    id: todo.id,
    threadId: todo.threadId,
    text: todo.text,
    done: todo.done,
    createdAt: todo.createdAt.toISOString(),
    completedAt: todo.completedAt?.toISOString() ?? null,
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: threadId } = await params
  const thread = getThread(threadId)
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ todos: listTodos(threadId).map(serializeTodo) })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: threadId } = await params
  const thread = getThread(threadId)
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json() as { text?: string }
  const text = body.text?.trim() ?? ''
  if (!text) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'text is required' } },
      { status: 422 }
    )
  }

  const todo = createTodo(threadId, text)
  return NextResponse.json({ todo: serializeTodo(todo) }, { status: 201 })
}
