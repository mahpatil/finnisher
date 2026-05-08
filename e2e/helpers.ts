import type { APIRequestContext } from '@playwright/test'

const T = '/api/threads/seed'
const S = '/api/sessions/seed'

export async function resetAll(request: APIRequestContext) {
  await request.post(S, { data: { reset: true } })
  await request.post(T, { data: { reset: true } })
}

export async function seedThread(
  request: APIRequestContext,
  opts: {
    title?: string
    state?: 'active' | 'waiting' | 'blocked' | 'done'
    nextAction?: string
    owner?: 'you' | 'ai_agent' | 'other'
    stale?: boolean
    completedAt?: string
  } = {},
) {
  const { stale, ...rest } = opts
  return request.post(T, {
    data: {
      title: rest.title ?? 'Test thread',
      nextAction: rest.nextAction ?? 'Do something',
      state: rest.state ?? 'active',
      owner: rest.owner ?? 'you',
      ...(stale ? { updatedAt: new Date(Date.now() - 72 * 3_600_000).toISOString() } : {}),
      ...(rest.completedAt ? { completedAt: rest.completedAt } : {}),
    },
  })
}

export async function seedSession(
  request: APIRequestContext,
  opts: {
    agent?: string
    tokensIn?: number
    tokensOut?: number
    costUsd?: number
    unpushedCount?: number
    gitBranch?: string
    lastCommitMsg?: string
    githubUrl?: string
    folderName?: string
    endedAt?: string | null
  } = {},
) {
  const now = Date.now()
  return request.post(S, {
    data: {
      agent: opts.agent ?? 'claude_code',
      startedAt: new Date(now - 3_600_000).toISOString(),
      endedAt: opts.endedAt !== undefined ? opts.endedAt : new Date(now).toISOString(),
      tokensIn: opts.tokensIn ?? 1000,
      tokensOut: opts.tokensOut ?? 500,
      costUsd: opts.costUsd ?? 0.05,
      unpushedCount: opts.unpushedCount ?? 0,
      gitBranch: opts.gitBranch ?? 'main',
      lastCommitMsg: opts.lastCommitMsg ?? 'chore: test',
      ...(opts.githubUrl ? { githubUrl: opts.githubUrl } : {}),
      ...(opts.folderName ? { folderName: opts.folderName } : {}),
    },
  })
}

export function threadsUrl(url: string) {
  try {
    return new URL(url).pathname === '/api/threads'
  } catch {
    return false
  }
}
