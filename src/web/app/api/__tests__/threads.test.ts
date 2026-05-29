import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-api-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init)
}

async function setup() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  vi.resetModules()
  const { runMigrations } = await import('@db/migrate')
  runMigrations()
  const threadsRoute = await import('../threads/route.js')
  const threadIdRoute = await import('../threads/[id]/route.js')
  return { threadsRoute, threadIdRoute }
}

afterEach(async () => {
  const { _resetDb } = await import('@db/db')
  _resetDb()
  vi.resetModules()
})

// ── GET /api/threads ───────────────────────────────────────────────────────

describe('GET /api/threads', () => {
  it('returns empty threads array and null focusWarning when no threads exist', async () => {
    const { threadsRoute } = await setup()
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads'))
    const body = await res.json() as { threads: unknown[]; focusWarning: unknown }
    expect(body.threads).toEqual([])
    expect(body.focusWarning).toBeNull()
  })

  it('excludes archived threads by default', async () => {
    const { threadsRoute } = await setup()
    const { createThread, archiveThread } = await import('@db/threads')
    const open = createThread({ title: 'Open', nextAction: 'N', state: 'open', owner: 'you' })
    const arch = createThread({ title: 'Archived', nextAction: 'N', state: 'open', owner: 'you' })
    archiveThread(arch.id)
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads'))
    const body = await res.json() as { threads: Array<{ id: string }> }
    expect(body.threads.map(t => t.id)).toContain(open.id)
    expect(body.threads.map(t => t.id)).not.toContain(arch.id)
  })

  it('returns archived threads when state=archived filter is applied', async () => {
    const { threadsRoute } = await setup()
    const { createThread, archiveThread } = await import('@db/threads')
    const arch = createThread({ title: 'Archived', nextAction: 'N', state: 'open', owner: 'you' })
    archiveThread(arch.id)
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads?state=archived'))
    const body = await res.json() as { threads: Array<{ id: string }> }
    expect(body.threads.map(t => t.id)).toContain(arch.id)
  })

  it('filters by priority', async () => {
    const { threadsRoute } = await setup()
    const { createThread } = await import('@db/threads')
    const nowThread = createThread({ title: 'Now', nextAction: 'N', state: 'open', priority: 'now', owner: 'you' })
    createThread({ title: 'Later', nextAction: 'N', state: 'open', priority: 'later', owner: 'you' })
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads?priority=now'))
    const body = await res.json() as { threads: Array<{ id: string }> }
    expect(body.threads).toHaveLength(1)
    expect(body.threads[0].id).toBe(nowThread.id)
  })

  it('returns 422 for invalid state filter', async () => {
    const { threadsRoute } = await setup()
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads?state=invalid'))
    expect(res.status).toBe(422)
  })

  it('returns 422 for invalid priority filter', async () => {
    const { threadsRoute } = await setup()
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads?priority=invalid'))
    expect(res.status).toBe(422)
  })

  it('serialized thread includes momentum field', async () => {
    const { threadsRoute } = await setup()
    const { createThread } = await import('@db/threads')
    createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads'))
    const body = await res.json() as { threads: Array<{ momentum: unknown }> }
    expect(typeof body.threads[0].momentum).toBe('number')
  })

  it('returns focusWarning when more than 5 active threads exist', async () => {
    const { threadsRoute } = await setup()
    const { createThread } = await import('@db/threads')
    for (let i = 0; i < 6; i++) {
      createThread({ title: `T${i}`, nextAction: 'N', state: 'open', owner: 'you' })
    }
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads'))
    const body = await res.json() as { focusWarning: { level: string; count: number } | null }
    expect(body.focusWarning).not.toBeNull()
    expect(body.focusWarning?.level).toBe('caution')
    expect(body.focusWarning?.count).toBe(6)
  })

  it('returns null folderName, repoUrl, projectPath when thread has no sessions', async () => {
    const { threadsRoute } = await setup()
    const { createThread } = await import('@db/threads')
    createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads'))
    const body = await res.json() as { threads: Array<{ folderName: unknown; repoUrl: unknown; projectPath: unknown }> }
    expect(body.threads[0].folderName).toBeNull()
    expect(body.threads[0].repoUrl).toBeNull()
    expect(body.threads[0].projectPath).toBeNull()
  })

  it('populates folderName, repoUrl, projectPath from the latest session', async () => {
    const { threadsRoute } = await setup()
    const { createThread } = await import('@db/threads')
    const { createSession } = await import('@db/sessions')
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    createSession({
      agent: 'claude_code',
      startedAt: new Date(),
      threadId: t.id,
      folderName: 'my-app',
      githubUrl: 'https://github.com/org/my-app',
      projectPath: '/home/user/my-app',
    })
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads'))
    const body = await res.json() as { threads: Array<{ folderName: string; repoUrl: string; projectPath: string }> }
    expect(body.threads[0].folderName).toBe('my-app')
    expect(body.threads[0].repoUrl).toBe('https://github.com/org/my-app')
    expect(body.threads[0].projectPath).toBe('/home/user/my-app')
  })
})

// ── POST /api/threads ──────────────────────────────────────────────────────

describe('POST /api/threads', () => {
  it('creates a thread and returns 201', async () => {
    const { threadsRoute } = await setup()
    const res = await threadsRoute.POST(makeRequest('http://localhost/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Thread', nextAction: 'Start here' }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string; title: string; state: string; priority: string }
    expect(body.id).toHaveLength(10)
    expect(body.title).toBe('New Thread')
    expect(body.state).toBe('open')
    expect(body.priority).toBe('later')
  })

  it('returns 400 when title is missing', async () => {
    const { threadsRoute } = await setup()
    const res = await threadsRoute.POST(makeRequest('http://localhost/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextAction: 'Do something' }),
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when nextAction is missing', async () => {
    const { threadsRoute } = await setup()
    const res = await threadsRoute.POST(makeRequest('http://localhost/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Title only' }),
    }))
    expect(res.status).toBe(400)
  })

  it('accepts optional state and priority', async () => {
    const { threadsRoute } = await setup()
    const res = await threadsRoute.POST(makeRequest('http://localhost/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'T', nextAction: 'N', state: 'waiting', priority: 'now' }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json() as { state: string; priority: string }
    expect(body.state).toBe('waiting')
    expect(body.priority).toBe('now')
  })

  it('returns 422 for invalid state', async () => {
    const { threadsRoute } = await setup()
    const res = await threadsRoute.POST(makeRequest('http://localhost/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'T', nextAction: 'N', state: 'bogus' }),
    }))
    expect(res.status).toBe(422)
  })

  it('returns 422 for invalid priority', async () => {
    const { threadsRoute } = await setup()
    const res = await threadsRoute.POST(makeRequest('http://localhost/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'T', nextAction: 'N', priority: 'bogus' }),
    }))
    expect(res.status).toBe(422)
  })
})

// ── GET /api/threads/:id ───────────────────────────────────────────────────

describe('GET /api/threads/:id', () => {
  it('returns the thread by id', async () => {
    const { threadIdRoute } = await setup()
    const { createThread } = await import('@db/threads')
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const res = await threadIdRoute.GET(makeRequest(`http://localhost/api/threads/${t.id}`), { params: Promise.resolve({ id: t.id }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { id: string }
    expect(body.id).toBe(t.id)
  })

  it('returns 404 for unknown id', async () => {
    const { threadIdRoute } = await setup()
    const res = await threadIdRoute.GET(makeRequest('http://localhost/api/threads/nope'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})

// ── PATCH /api/threads/:id ─────────────────────────────────────────────────

describe('PATCH /api/threads/:id', () => {
  it('updates state', async () => {
    const { threadIdRoute } = await setup()
    const { createThread } = await import('@db/threads')
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const res = await threadIdRoute.PATCH(makeRequest(`http://localhost/api/threads/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'waiting' }),
    }), { params: Promise.resolve({ id: t.id }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { state: string }
    expect(body.state).toBe('waiting')
  })

  it('updates priority', async () => {
    const { threadIdRoute } = await setup()
    const { createThread } = await import('@db/threads')
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', priority: 'later', owner: 'you' })
    const res = await threadIdRoute.PATCH(makeRequest(`http://localhost/api/threads/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'now' }),
    }), { params: Promise.resolve({ id: t.id }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { priority: string }
    expect(body.priority).toBe('now')
  })

  it('updates nextAction', async () => {
    const { threadIdRoute } = await setup()
    const { createThread } = await import('@db/threads')
    const t = createThread({ title: 'T', nextAction: 'old', state: 'open', owner: 'you' })
    const res = await threadIdRoute.PATCH(makeRequest(`http://localhost/api/threads/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextAction: 'new action' }),
    }), { params: Promise.resolve({ id: t.id }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { nextAction: string }
    expect(body.nextAction).toBe('new action')
  })

  it('archiving sets archivedAt in the response', async () => {
    const { threadIdRoute } = await setup()
    const { createThread } = await import('@db/threads')
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const res = await threadIdRoute.PATCH(makeRequest(`http://localhost/api/threads/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'archived' }),
    }), { params: Promise.resolve({ id: t.id }) })
    const body = await res.json() as { state: string; archivedAt: string | null }
    expect(body.state).toBe('archived')
    expect(body.archivedAt).not.toBeNull()
  })

  it('returns 422 for invalid state', async () => {
    const { threadIdRoute } = await setup()
    const { createThread } = await import('@db/threads')
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const res = await threadIdRoute.PATCH(makeRequest(`http://localhost/api/threads/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'invalid' }),
    }), { params: Promise.resolve({ id: t.id }) })
    expect(res.status).toBe(422)
  })

  it('returns 422 for invalid priority', async () => {
    const { threadIdRoute } = await setup()
    const { createThread } = await import('@db/threads')
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const res = await threadIdRoute.PATCH(makeRequest(`http://localhost/api/threads/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: 'invalid' }),
    }), { params: Promise.resolve({ id: t.id }) })
    expect(res.status).toBe(422)
  })

  it('returns 404 for unknown id', async () => {
    const { threadIdRoute } = await setup()
    const res = await threadIdRoute.PATCH(makeRequest('http://localhost/api/threads/nope', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'open' }),
    }), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})

// ── DELETE /api/threads/:id ────────────────────────────────────────────────

describe('DELETE /api/threads/:id', () => {
  it('deletes the thread and returns { deleted: true }', async () => {
    const { threadIdRoute } = await setup()
    const { createThread, getThread } = await import('@db/threads')
    const t = createThread({ title: 'T', nextAction: 'N', state: 'open', owner: 'you' })
    const res = await threadIdRoute.DELETE(makeRequest(`http://localhost/api/threads/${t.id}`), { params: Promise.resolve({ id: t.id }) })
    expect(res.status).toBe(200)
    const body = await res.json() as { deleted: boolean }
    expect(body.deleted).toBe(true)
    expect(getThread(t.id)).toBeUndefined()
  })

  it('returns 404 for unknown id', async () => {
    const { threadIdRoute } = await setup()
    const res = await threadIdRoute.DELETE(makeRequest('http://localhost/api/threads/nope'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})

// ── completionPct field on GET /api/threads ───────────────────────────────

describe('GET /api/threads — completionPct', () => {
  it('includes completionPct field (0 for fresh thread) on each thread', async () => {
    const { threadsRoute } = await setup()
    const { createThread } = await import('@db/threads')
    createThread({ title: 'Fresh', nextAction: 'x', state: 'open', owner: 'you' })
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads'))
    const body = await res.json() as { threads: Array<{ completionPct: number }> }
    expect(typeof body.threads[0].completionPct).toBe('number')
  })

  it('includes launchReady field on each thread', async () => {
    const { threadsRoute } = await setup()
    const { createThread } = await import('@db/threads')
    createThread({ title: 'Fresh', nextAction: 'x', state: 'open', owner: 'you' })
    const res = threadsRoute.GET(makeRequest('http://localhost/api/threads'))
    const body = await res.json() as { threads: Array<{ launchReady: boolean }> }
    expect(typeof body.threads[0].launchReady).toBe('boolean')
  })
})
