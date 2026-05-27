import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath() {
  return join(tmpdir(), 'finn-api-lc-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init)
}

async function setup() {
  process.env['FINNISHER_DB_PATH'] = tempDbPath()
  vi.resetModules()
  const { runMigrations } = await import('@db/migrate')
  runMigrations()
  const { createThread } = await import('@db/threads')
  const thread = createThread({ title: 'Test Thread', nextAction: 'Ship it', state: 'open', owner: 'you' })
  const lcRoute = await import('../threads/[id]/launch-criteria/route.js')
  const lcIdRoute = await import('../threads/[id]/launch-criteria/[critId]/route.js')
  return { thread, lcRoute, lcIdRoute }
}

afterEach(async () => {
  const { _resetDb } = await import('@db/db')
  _resetDb()
  vi.resetModules()
})

describe('GET /api/threads/[id]/launch-criteria', () => {
  it('returns empty array when no criteria exist', async () => {
    const { thread, lcRoute } = await setup()
    const res = await lcRoute.GET(makeRequest('http://localhost'), { params: Promise.resolve({ id: thread.id }) })
    const body = await res.json() as unknown[]
    expect(body).toEqual([])
  })

  it('returns 404 when thread does not exist', async () => {
    const { lcRoute } = await setup()
    const res = await lcRoute.GET(makeRequest('http://localhost'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/threads/[id]/launch-criteria', () => {
  it('creates a criterion and returns 201', async () => {
    const { thread, lcRoute } = await setup()
    const res = await lcRoute.POST(
      makeRequest('http://localhost', { method: 'POST', body: JSON.stringify({ text: 'Deployed to prod' }) }),
      { params: Promise.resolve({ id: thread.id }) },
    )
    expect(res.status).toBe(201)
    const body = await res.json() as { text: string; checked: boolean }
    expect(body.text).toBe('Deployed to prod')
    expect(body.checked).toBe(false)
  })

  it('returns 400 when text is missing', async () => {
    const { thread, lcRoute } = await setup()
    const res = await lcRoute.POST(
      makeRequest('http://localhost', { method: 'POST', body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: thread.id }) },
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when thread does not exist', async () => {
    const { lcRoute } = await setup()
    const res = await lcRoute.POST(
      makeRequest('http://localhost', { method: 'POST', body: JSON.stringify({ text: 'X' }) }),
      { params: Promise.resolve({ id: 'nope' }) },
    )
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/threads/[id]/launch-criteria/[critId]', () => {
  it('toggles checked state and returns updated criterion', async () => {
    const { thread, lcRoute, lcIdRoute } = await setup()
    const postRes = await lcRoute.POST(
      makeRequest('http://localhost', { method: 'POST', body: JSON.stringify({ text: 'Ship it' }) }),
      { params: Promise.resolve({ id: thread.id }) },
    )
    const created = await postRes.json() as { id: string }

    const patchRes = await lcIdRoute.PATCH(
      makeRequest('http://localhost', { method: 'PATCH', body: JSON.stringify({ checked: true }) }),
      { params: Promise.resolve({ id: thread.id, critId: created.id }) },
    )
    expect(patchRes.status).toBe(200)
    const body = await patchRes.json() as { checked: boolean }
    expect(body.checked).toBe(true)
  })

  it('returns 400 when checked is not a boolean', async () => {
    const { thread, lcRoute, lcIdRoute } = await setup()
    const postRes = await lcRoute.POST(
      makeRequest('http://localhost', { method: 'POST', body: JSON.stringify({ text: 'Ship it' }) }),
      { params: Promise.resolve({ id: thread.id }) },
    )
    const created = await postRes.json() as { id: string }

    const patchRes = await lcIdRoute.PATCH(
      makeRequest('http://localhost', { method: 'PATCH', body: JSON.stringify({ checked: 'yes' }) }),
      { params: Promise.resolve({ id: thread.id, critId: created.id }) },
    )
    expect(patchRes.status).toBe(400)
  })
})

describe('DELETE /api/threads/[id]/launch-criteria/[critId]', () => {
  it('removes the criterion and returns 204', async () => {
    const { thread, lcRoute, lcIdRoute } = await setup()
    const postRes = await lcRoute.POST(
      makeRequest('http://localhost', { method: 'POST', body: JSON.stringify({ text: 'Ship it' }) }),
      { params: Promise.resolve({ id: thread.id }) },
    )
    const created = await postRes.json() as { id: string }

    const deleteRes = await lcIdRoute.DELETE(
      makeRequest('http://localhost', { method: 'DELETE' }),
      { params: Promise.resolve({ id: thread.id, critId: created.id }) },
    )
    expect(deleteRes.status).toBe(204)

    const getRes = await lcRoute.GET(makeRequest('http://localhost'), { params: Promise.resolve({ id: thread.id }) })
    const body = await getRes.json() as unknown[]
    expect(body).toHaveLength(0)
  })
})
