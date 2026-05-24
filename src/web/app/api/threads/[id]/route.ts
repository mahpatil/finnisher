import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { getThread, updateState, updateNextAction, updatePriority, archiveThread, unarchiveThread, deleteThread, isStalled } from '@db/threads'
import { THREAD_STATES, THREAD_PRIORITIES } from '@db/schema'
import type { ThreadState, ThreadPriority } from '@db/schema'
import type { ThreadWithMeta } from '../route.js'

runMigrations()

function serialize(thread: ReturnType<typeof getThread>): ThreadWithMeta {
  if (!thread) throw new Error('Thread not found')
  return {
    id: thread.id,
    title: thread.title,
    state: thread.state,
    priority: thread.priority,
    nextAction: thread.nextAction,
    owner: thread.owner,
    notes: thread.notes ?? null,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    completedAt: thread.completedAt?.toISOString() ?? null,
    archivedAt: thread.archivedAt?.toISOString() ?? null,
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

  const body = await request.json() as { state?: string; nextAction?: string; priority?: string }

  if (body.state !== undefined) {
    if (!THREAD_STATES.includes(body.state as ThreadState)) {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: `Invalid state "${body.state}". Valid: ${THREAD_STATES.join(', ')}` } },
        { status: 422 }
      )
    }
    if (body.state === 'archived') {
      archiveThread(id)
    } else if (thread.state === 'archived') {
      unarchiveThread(id)
      if (body.state !== 'open') updateState(id, body.state as ThreadState)
    } else {
      updateState(id, body.state as ThreadState)
    }
  }

  if (body.priority !== undefined) {
    if (!THREAD_PRIORITIES.includes(body.priority as ThreadPriority)) {
      return NextResponse.json(
        { error: { code: 'INVALID_PRIORITY', message: `Invalid priority "${body.priority}". Valid: ${THREAD_PRIORITIES.join(', ')}` } },
        { status: 422 }
      )
    }
    updatePriority(id, body.priority as ThreadPriority)
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
