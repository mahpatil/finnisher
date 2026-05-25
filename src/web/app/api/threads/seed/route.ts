import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { getDb, getSqlite } from '@db/db'
import { threads } from '@db/schema'
import type { ThreadState, ThreadPriority } from '@db/schema'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 10)

runMigrations()

export async function POST(request: Request) {
  const data = await request.json() as Record<string, unknown>

  if (data['reset']) {
    const db = getSqlite()
    db.prepare('UPDATE sessions SET thread_id = NULL').run()
    db.prepare('DELETE FROM threads').run()
    return NextResponse.json({ reset: true })
  }

  const now = new Date()
  const updatedAt = data['updatedAt'] ? new Date(data['updatedAt'] as string) : now
  const completedAt = data['completedAt'] ? new Date(data['completedAt'] as string) : null
  const state = ((data['state'] as string) ?? 'open') as ThreadState
  const archivedAt = state === 'archived' ? now : null

  getDb().insert(threads).values({
    id: nanoid(10),
    title: (data['title'] as string) ?? 'Test Thread',
    state,
    priority: ((data['priority'] as string) ?? 'later') as ThreadPriority,
    nextAction: (data['nextAction'] as string) ?? 'Do something',
    owner: (data['owner'] as 'you' | 'ai_agent' | 'other') ?? 'you',
    notes: (data['notes'] as string | null) ?? null,
    createdAt: now,
    updatedAt,
    completedAt,
    archivedAt,
  }).run()

  return NextResponse.json({ created: true })
}
