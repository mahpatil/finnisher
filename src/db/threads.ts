import { eq, ne, and, count, desc } from 'drizzle-orm'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 10)
import { getDb } from './db.js'
import { threads, sessions, type Thread, type NewThread, type ThreadState } from './schema.js'

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
  if (state === 'done') updates.completedAt = new Date()
  getDb().update(threads).set(updates).where(eq(threads.id, id)).run()
}

export function updateMomentum(id: string, momentum: number): void {
  getDb().update(threads).set({ momentum, updatedAt: new Date() }).where(eq(threads.id, id)).run()
}

export function setStalled(id: string, stalled: boolean): void {
  getDb().update(threads).set({ stalled, updatedAt: new Date() }).where(eq(threads.id, id)).run()
}

export function findThreadIdByFolderName(folderName: string): string | null {
  // 1. Try to find via existing sessions (most recent thread first)
  const result = getDb()
    .select({ threadId: sessions.threadId })
    .from(sessions)
    .innerJoin(threads, eq(sessions.threadId, threads.id))
    .where(eq(sessions.folderName, folderName))
    .orderBy(desc(threads.updatedAt))
    .limit(1)
    .get()
  
  if (result?.threadId) return result.threadId

  // 2. Fallback: Try to find a thread with a title matching the folder name exactly (case-insensitive)
  const all = listThreads()
  const matching = all.find(t => t.title.toLowerCase() === folderName.toLowerCase())
  
  return matching?.id ?? null
}

export function touchThread(id: string): void {
  getDb()
    .update(threads)
    .set({ updatedAt: new Date() })
    .where(and(eq(threads.id, id), ne(threads.state, 'done')))
    .run()
}

export function deleteThread(id: string): void {
  getDb().delete(threads).where(eq(threads.id, id)).run()
}

export function isStalled(thread: Thread): boolean {
  return thread.state !== 'done' && Date.now() - thread.updatedAt.getTime() > STALL_MS
}

export function activeThreadCount(): number {
  const result = getDb().select({ count: count() }).from(threads).where(eq(threads.state, 'active')).get()
  return result?.count ?? 0
}

export function overloadWarning(allThreads: Thread[]): FocusWarning | null {
  const active = allThreads.filter(t => t.state === 'active')
  const count = active.length
  if (count <= 5) return null

  const suggestions = [...active]
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .slice(0, 3)

  const level: WarningLevel = count >= 9 ? 'urgent' : 'caution'
  const message = level === 'urgent'
    ? `⛔ ${count} active threads — focus is critically scattered. Finish or park these first:`
    : `⚠  ${count} active threads — above the 5-thread focus ideal. Consider closing these:`

  return { level, count, message, suggestions }
}
