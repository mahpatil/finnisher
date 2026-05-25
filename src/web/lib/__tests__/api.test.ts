import { describe, it, expect, vi, beforeEach } from 'vitest'
import { patchThread } from '../api.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('patchThread', () => {
  it('resolves without throwing when response is 200', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    await expect(patchThread('abc123', { state: 'closed' })).resolves.toBeUndefined()
  })

  it('sends PATCH to /api/threads/<id> with JSON body', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    await patchThread('tid1', { nextAction: 'Ship it' })
    expect(mockFetch).toHaveBeenCalledWith('/api/threads/tid1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextAction: 'Ship it' }),
    })
  })

  it('throws with server error message when response is 422', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: { code: 'INVALID_STATE', message: 'Invalid state "bogus"' } }),
    })
    await expect(patchThread('abc', { state: 'bogus' })).rejects.toThrow('Invalid state "bogus"')
  })

  it('throws with status fallback when response is non-ok but body is not parseable', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json') },
    })
    await expect(patchThread('abc', { state: 'open' })).rejects.toThrow('Request failed (500)')
  })

  it('throws with generic message when fetch itself rejects (network error)', async () => {
    mockFetch.mockRejectedValue(new Error('Failed to fetch'))
    await expect(patchThread('abc', { state: 'open' })).rejects.toThrow('Failed to fetch')
  })
})
