import type { Thread } from '../../db/schema.js'

export function getAbandonCandidates(threads: Thread[], stallMs: number): Thread[] {
  const stalled = threads
    .filter(t =>
      t.state !== 'closed' &&
      t.state !== 'archived' &&
      Date.now() - t.updatedAt.getTime() > stallMs,
    )
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .slice(0, 5)

  return stalled.length >= 2 ? stalled : []
}
