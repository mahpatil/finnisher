import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { createSession } from '@db/sessions'
import { getSqlite } from '@db/db'

runMigrations()

export async function POST(request: Request) {
  const data = await request.json() as {
    agent?: string
    folderName?: string | null
    githubUrl?: string | null
    reset?: boolean
  }

  if (data.reset) {
    getSqlite().prepare('DELETE FROM sessions').run()
    return NextResponse.json({ reset: true })
  }

  const session = createSession({
    agent: (data.agent as 'claude_code') ?? 'manual',
    startedAt: new Date(),
    folderName: data.folderName ?? null,
    githubUrl: data.githubUrl ?? null,
  })
  return NextResponse.json(session)
}
