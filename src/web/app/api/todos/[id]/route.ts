import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { updateTodo, deleteTodo } from '@db/todos'
import { getDb } from '@db/db'
import { threadTodos } from '@db/schema'
import { eq } from 'drizzle-orm'

runMigrations()

function serializeTodo(todo: ReturnType<typeof updateTodo>) {
  return {
    id: todo.id,
    threadId: todo.threadId,
    text: todo.text,
    done: todo.done,
    createdAt: todo.createdAt.toISOString(),
    completedAt: todo.completedAt?.toISOString() ?? null,
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = getDb().select().from(threadTodos).where(eq(threadTodos.id, id)).get()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json() as { done?: boolean; text?: string }

  if (body.text !== undefined && body.text.trim() === '') {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'text must not be empty' } },
      { status: 422 }
    )
  }

  const patch: { done?: boolean; text?: string } = {}
  if (body.done !== undefined) patch.done = body.done
  if (body.text !== undefined) patch.text = body.text.trim()

  const updated = updateTodo(id, patch)
  return NextResponse.json({ todo: serializeTodo(updated) })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const existing = getDb().select().from(threadTodos).where(eq(threadTodos.id, id)).get()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  deleteTodo(id)
  return new NextResponse(null, { status: 204 })
}
