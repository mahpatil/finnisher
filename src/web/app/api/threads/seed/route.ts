import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { getDb } from '@db/db'
import { threads } from '@db/schema'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 10)

runMigrations()

export async function POST(request: Request) {
  const data = await request.json() as Record<string, unknown>

  if (data['reset']) {
    getDb().delete(threads).run()
    return NextResponse.json({ reset: true })
  }

  const now = new Date()
  const updatedAt = data['updatedAt'] ? new Date(data['updatedAt'] as string) : now
  const completedAt = data['completedAt'] ? new Date(data['completedAt'] as string) : null

  getDb().insert(threads).values({
    id: nanoid(10),
    title: (data['title'] as string) ?? 'Test Thread',
    state: (data['state'] as 'active' | 'waiting' | 'blocked' | 'done') ?? 'active',
    nextAction: (data['nextAction'] as string) ?? 'Do something',
    owner: (data['owner'] as 'you' | 'ai_agent' | 'other') ?? 'you',
    notes: (data['notes'] as string | null) ?? null,
    createdAt: now,
    updatedAt,
    completedAt,
  }).run()

  return NextResponse.json({ created: true })
}
