import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { getThread, updateState, updateNextAction, deleteThread, isStalled } from '@db/threads'
import type { ThreadWithMeta } from '../route.js'

runMigrations()

function serialize(thread: ReturnType<typeof getThread>): ThreadWithMeta {
  if (!thread) throw new Error('Thread not found')
  return {
    id: thread.id,
    title: thread.title,
    state: thread.state,
    nextAction: thread.nextAction,
    owner: thread.owner,
    notes: thread.notes ?? null,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    completedAt: thread.completedAt?.toISOString() ?? null,
    stalled: isStalled(thread),
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const thread = getThread(id)
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(serialize(thread))
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const thread = getThread(id)
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json() as { state?: string; nextAction?: string }
  if (body.state) {
    updateState(id, body.state as 'active' | 'waiting' | 'blocked' | 'done')
  }
  if (body.nextAction !== undefined) {
    updateNextAction(id, body.nextAction)
  }
  return NextResponse.json(serialize(getThread(id)!))
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const thread = getThread(id)
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  deleteThread(id)
  return NextResponse.json({ deleted: true })
}
