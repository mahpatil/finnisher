import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { listThreads, createThread, isStalled, overloadWarning } from '@db/threads'
import { THREAD_STATES, THREAD_PRIORITIES } from '@db/schema'
import type { ThreadState, ThreadPriority } from '@db/schema'

runMigrations()

export interface ThreadWithMeta {
  id: string
  title: string
  state: string
  priority: string
  nextAction: string
  owner: string
  notes: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  archivedAt: string | null
  stalled: boolean
  momentum: number
}

export interface ThreadsResponse {
  threads: ThreadWithMeta[]
  focusWarning: { level: string; count: number; message: string; suggestions: ThreadWithMeta[] } | null
}

function serialize(thread: ReturnType<typeof listThreads>[number]): ThreadWithMeta {
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
    momentum: thread.momentum,
  }
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const stateParam = searchParams.get('state')
  const priorityParam = searchParams.get('priority')

  if (stateParam && !THREAD_STATES.includes(stateParam as ThreadState)) {
    return NextResponse.json(
      { error: { code: 'INVALID_STATE', message: `Invalid state "${stateParam}". Valid: ${THREAD_STATES.join(', ')}` } },
      { status: 422 }
    )
  }
  if (priorityParam && !THREAD_PRIORITIES.includes(priorityParam as ThreadPriority)) {
    return NextResponse.json(
      { error: { code: 'INVALID_PRIORITY', message: `Invalid priority "${priorityParam}". Valid: ${THREAD_PRIORITIES.join(', ')}` } },
      { status: 422 }
    )
  }

  const all = listThreads()

  let filtered = stateParam
    ? all.filter(t => t.state === stateParam)
    : all.filter(t => t.state !== 'archived')

  if (priorityParam) {
    filtered = filtered.filter(t => t.priority === priorityParam)
  }

  const warning = overloadWarning(all)
  const response: ThreadsResponse = {
    threads: filtered.map(serialize),
    focusWarning: warning
      ? { ...warning, suggestions: warning.suggestions.map(serialize) }
      : null,
  }
  return NextResponse.json(response)
}

export async function POST(request: Request) {
  const body = await request.json() as {
    title: string
    nextAction: string
    state?: string
    priority?: string
    owner?: string
    notes?: string
  }
  if (!body.title || !body.nextAction) {
    return NextResponse.json({ error: 'title and nextAction are required' }, { status: 400 })
  }
  if (body.state && !THREAD_STATES.includes(body.state as ThreadState)) {
    return NextResponse.json(
      { error: { code: 'INVALID_STATE', message: `Invalid state "${body.state}"` } },
      { status: 422 }
    )
  }
  if (body.priority && !THREAD_PRIORITIES.includes(body.priority as ThreadPriority)) {
    return NextResponse.json(
      { error: { code: 'INVALID_PRIORITY', message: `Invalid priority "${body.priority}"` } },
      { status: 422 }
    )
  }
  try {
    const state = (body.state as ThreadState) ?? 'open'
    const thread = createThread({
      title: body.title,
      nextAction: body.nextAction,
      state,
      priority: (body.priority as ThreadPriority) ?? 'later',
      owner: (body.owner as 'you' | 'ai_agent' | 'other') ?? 'you',
      notes: body.notes ?? null,
      completedAt: state === 'closed' ? new Date() : null,
    })
    return NextResponse.json(serialize(thread), { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
