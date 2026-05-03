import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { listThreads, createThread, isStalled, overloadWarning } from '@db/threads'

runMigrations()

export interface ThreadWithMeta {
  id: string
  title: string
  state: string
  nextAction: string
  owner: string
  notes: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  stalled: boolean
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
    nextAction: thread.nextAction,
    owner: thread.owner,
    notes: thread.notes ?? null,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    completedAt: thread.completedAt?.toISOString() ?? null,
    stalled: isStalled(thread),
  }
}

export function GET() {
  const all = listThreads()
  const warning = overloadWarning(all)
  const response: ThreadsResponse = {
    threads: all.map(serialize),
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
    owner?: string
    notes?: string
  }
  if (!body.title || !body.nextAction) {
    return NextResponse.json({ error: 'title and nextAction are required' }, { status: 400 })
  }
  try {
    const thread = createThread({
      title: body.title,
      nextAction: body.nextAction,
      state: (body.state as 'active' | 'waiting' | 'blocked' | 'done') ?? 'active',
      owner: (body.owner as 'you' | 'ai_agent' | 'other') ?? 'you',
      notes: body.notes ?? null,
      completedAt: body.state === 'done' ? new Date() : null,
    })
    return NextResponse.json(serialize(thread), { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
