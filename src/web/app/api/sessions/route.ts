import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { listSessions } from '@db/sessions'

runMigrations()

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const threadId = searchParams.get('threadId') ?? undefined
  const sessions = listSessions({ threadId, limit: 50 })
  return NextResponse.json(sessions)
}
