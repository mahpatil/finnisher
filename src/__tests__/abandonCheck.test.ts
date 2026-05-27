import { describe, it, expect } from 'vitest'
import type { Thread } from '../db/schema.js'

function makeThread(overrides: Partial<Thread> = {}): Thread {
  return {
    id: 'abc',
    title: 'Test',
    state: 'open',
    nextAction: 'do it',
    owner: 'you',
    notes: null,
    priority: 'later',
    momentum: 0,
    stalled: false,
    lastVelocity: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    archivedAt: null,
    ...overrides,
  }
}

const STALL_MS = 48 * 3600 * 1000
const old = new Date(Date.now() - STALL_MS - 1000)

describe('getAbandonCandidates', () => {
  it('returns empty array when fewer than 2 threads are stalled', async () => {
    const { getAbandonCandidates } = await import('../cli/ui/abandonCheck.js')
    const threads = [
      makeThread({ id: 'a', updatedAt: old }),
      makeThread({ id: 'b', updatedAt: new Date() }),
    ]
    expect(getAbandonCandidates(threads, STALL_MS)).toHaveLength(0)
  })

  it('returns stalled threads sorted stalest-first when 2 or more are stalled', async () => {
    const { getAbandonCandidates } = await import('../cli/ui/abandonCheck.js')
    const older = new Date(Date.now() - STALL_MS - 10000)
    const threads = [
      makeThread({ id: 'a', updatedAt: old }),
      makeThread({ id: 'b', updatedAt: older }),
      makeThread({ id: 'c', updatedAt: new Date() }),
    ]
    const result = getAbandonCandidates(threads, STALL_MS)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('b')
    expect(result[1].id).toBe('a')
  })

  it('caps at 5 threads even when more are stalled', async () => {
    const { getAbandonCandidates } = await import('../cli/ui/abandonCheck.js')
    const threads = Array.from({ length: 8 }, (_, i) =>
      makeThread({ id: `t${i}`, updatedAt: new Date(Date.now() - STALL_MS - i * 1000) }),
    )
    expect(getAbandonCandidates(threads, STALL_MS)).toHaveLength(5)
  })

  it('excludes closed and archived threads', async () => {
    const { getAbandonCandidates } = await import('../cli/ui/abandonCheck.js')
    const threads = [
      makeThread({ id: 'a', updatedAt: old, state: 'closed' }),
      makeThread({ id: 'b', updatedAt: old, state: 'archived' }),
      makeThread({ id: 'c', updatedAt: old }),
      makeThread({ id: 'd', updatedAt: old }),
    ]
    const result = getAbandonCandidates(threads, STALL_MS)
    expect(result.map(t => t.id)).toEqual(['c', 'd'])
  })
})
