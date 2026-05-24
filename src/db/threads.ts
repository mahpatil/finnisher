import { eq, and, inArray, count, desc } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 10)
import { getDb } from './db.js'
import { threads, sessions, type Thread, type NewThread, type ThreadState, type ThreadPriority } from './schema.js'

const STALL_MS = 48 * 60 * 60 * 1000

export type WarningLevel = 'caution' | 'urgent'

export interface FocusWarning {
  level: WarningLevel
  count: number
  message: string
  suggestions: Thread[]
}

export function listThreads(): Thread[] {
  return getDb().select().from(threads).all()
}

export function getThread(id: string): Thread | undefined {
  return getDb().select().from(threads).where(eq(threads.id, id)).get()
}

export function createThread(input: Omit<NewThread, 'id' | 'createdAt' | 'updatedAt'>): Thread {
  const now = new Date()
  const thread: NewThread = { id: nanoid(10), createdAt: now, updatedAt: now, ...input }
  getDb().insert(threads).values(thread).run()
  return getThread(thread.id)!
}

export function updateNextAction(id: string, nextAction: string): void {
  getDb().update(threads).set({ nextAction, updatedAt: new Date() }).where(eq(threads.id, id)).run()
}

export function updateState(id: string, state: ThreadState): void {
  const updates: Partial<NewThread> = { state, updatedAt: new Date() }
  if (state === 'closed') updates.completedAt = new Date()
  updates.archivedAt = state === 'archived' ? new Date() : null
  getDb().update(threads).set(updates).where(eq(threads.id, id)).run()
}

export function updatePriority(id: string, priority: ThreadPriority): void {
  getDb().update(threads).set({ priority, updatedAt: new Date() }).where(eq(threads.id, id)).run()
}

export function archiveThread(id: string): void {
  getDb().update(threads).set({ state: 'archived', archivedAt: new Date(), updatedAt: new Date() }).where(eq(threads.id, id)).run()
}

export function unarchiveThread(id: string): void {
  getDb().update(threads).set({ state: 'open', archivedAt: null, updatedAt: new Date() }).where(eq(threads.id, id)).run()
}

export function updateMomentum(id: string, momentum: number): void {
  getDb().update(threads).set({ momentum, updatedAt: new Date() }).where(eq(threads.id, id)).run()
}

export function setStalled(id: string, stalled: boolean): void {
  getDb().update(threads).set({ stalled, updatedAt: new Date() }).where(eq(threads.id, id)).run()
}

export function findThreadIdByFolderName(folderName: string): string | null {
  const result = getDb()
    .select({ threadId: sessions.threadId })
    .from(sessions)
    .innerJoin(threads, eq(sessions.threadId, threads.id))
    .where(eq(sessions.folderName, folderName))
    .orderBy(desc(threads.updatedAt))
    .limit(1)
    .get()

  if (result?.threadId) return result.threadId

  const all = listThreads()
  const matching = all.find(t => t.title.toLowerCase() === folderName.toLowerCase())
  return matching?.id ?? null
}

export function touchThread(id: string): void {
  getDb()
    .update(threads)
    .set({ updatedAt: new Date() })
    .where(and(eq(threads.id, id), inArray(threads.state, ['new', 'open', 'waiting', 'blocked'])))
    .run()
}

export function deleteThread(id: string): void {
  getDb().delete(threads).where(eq(threads.id, id)).run()
}

export function isStalled(thread: Thread): boolean {
  return thread.state !== 'closed' && thread.state !== 'archived' && Date.now() - thread.updatedAt.getTime() > STALL_MS
}

export function activeThreadCount(): number {
  const result = getDb()
    .select({ count: count() })
    .from(threads)
    .where(inArray(threads.state, ['new', 'open']))
    .get()
  return result?.count ?? 0
}

export function overloadWarning(allThreads: Thread[]): FocusWarning | null {
  const active = allThreads.filter(t => t.state === 'new' || t.state === 'open')
  const cnt = active.length
  if (cnt <= 5) return null

  const suggestions = [...active]
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .slice(0, 3)

  const level: WarningLevel = cnt >= 9 ? 'urgent' : 'caution'
  const message = level === 'urgent'
    ? `⛔ ${cnt} active threads — focus is critically scattered. Finish or park these first:`
    : `⚠  ${cnt} active threads — above the 5-thread focus ideal. Consider closing these:`

  return { level, count: cnt, message, suggestions }
}
