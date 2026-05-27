import { NextResponse } from 'next/server'
import { runMigrations } from '@db/migrate'
import { createSession } from '@db/sessions'
import { getSqlite } from '@db/db'

runMigrations()

export async function POST(request: Request) {
  const data = await request.json() as Record<string, unknown>

  if (data['reset']) {
    getSqlite().prepare('DELETE FROM sessions').run()
    return NextResponse.json({ reset: true })
  }

  const session = createSession({
    agent: (data['agent'] as 'claude_code' | 'codex' | 'opencode' | 'manual') ?? 'manual',
    startedAt: data['startedAt'] ? new Date(data['startedAt'] as string) : new Date(),
    endedAt: data['endedAt'] ? new Date(data['endedAt'] as string) : null,
    threadId: (data['threadId'] as string | null) ?? null,
    tokensIn: (data['tokensIn'] as number | null) ?? null,
    tokensOut: (data['tokensOut'] as number | null) ?? null,
    costUsd: (data['costUsd'] as number | null) ?? null,
    gitBranch: (data['gitBranch'] as string | null) ?? null,
    lastCommitSha: (data['lastCommitSha'] as string | null) ?? null,
    lastCommitMsg: (data['lastCommitMsg'] as string | null) ?? null,
    unpushedCount: (data['unpushedCount'] as number | null) ?? null,
    openFiles: null,
    projectPath: (data['projectPath'] as string | null) ?? null,
    folderName: (data['folderName'] as string | null) ?? null,
    githubUrl: (data['githubUrl'] as string | null) ?? null,
    intent: (data['intent'] as string | null) ?? null,
  })
  return NextResponse.json(session)
}
