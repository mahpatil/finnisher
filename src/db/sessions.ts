import { eq, isNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getDb } from './db.js'
import { sessions, type Session, type NewSession } from './schema.js'

export function createSession(input: Omit<NewSession, 'id'>): Session {
  const session: NewSession = { id: nanoid(10), ...input }
  getDb().insert(sessions).values(session).run()
  return getDb().select().from(sessions).where(eq(sessions.id, session.id)).get()!
}

export function closeSession(id: string, data: Partial<NewSession>): void {
  getDb().update(sessions).set(data).where(eq(sessions.id, id)).run()
}

export function listSessions(opts?: { threadId?: string; limit?: number }): Session[] {
  const base = getDb().select().from(sessions)
  const results = opts?.threadId
    ? base.where(eq(sessions.threadId, opts.threadId)).all()
    : base.all()
  if (opts?.limit) return results.slice(0, opts.limit)
  return results
}

export function getOpenSessions(): Session[] {
  return getDb().select().from(sessions).where(isNull(sessions.endedAt)).all()
}
