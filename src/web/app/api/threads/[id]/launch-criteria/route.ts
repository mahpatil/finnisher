import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { getThread } from '@db/threads'
import { getLaunchCriteria, addLaunchCriterion } from '@db/launchCriteria'

runMigrations()

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!getThread(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(getLaunchCriteria(id))
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!getThread(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const text = (body as Record<string, unknown>)?.['text']
  if (typeof text !== 'string' || text.trim() === '') {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const criterion = addLaunchCriterion(id, text.trim())
  return NextResponse.json(criterion, { status: 201 })
}
