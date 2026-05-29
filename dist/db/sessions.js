import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 10);
import { getDb } from './db.js';
import { sessions } from './schema.js';
export function createSession(input) {
    const session = { id: nanoid(10), ...input };
    getDb().insert(sessions).values(session).run();
    return getDb().select().from(sessions).where(eq(sessions.id, session.id)).get();
}
export function closeSession(id, data) {
    getDb().update(sessions).set(data).where(eq(sessions.id, id)).run();
}
export function listSessions(opts) {
    const base = getDb().select().from(sessions).orderBy(desc(sessions.startedAt));
    const conditions = [
        opts?.threadId ? eq(sessions.threadId, opts.threadId) : undefined,
        opts?.githubUrl ? eq(sessions.githubUrl, opts.githubUrl) : undefined,
        opts?.folderName ? eq(sessions.folderName, opts.folderName) : undefined,
    ].filter(Boolean);
    const results = conditions.length > 0
        ? base.where(and(...conditions)).all()
        : base.all();
    if (opts?.limit)
        return results.slice(0, opts.limit);
    return results;
}
export function getOpenSessions() {
    return getDb().select().from(sessions).where(isNull(sessions.endedAt)).orderBy(desc(sessions.startedAt)).all();
}
export function getOpenSessionForPath(projectPath) {
    return getDb()
        .select()
        .from(sessions)
        .where(and(isNull(sessions.endedAt), eq(sessions.projectPath, projectPath)))
        .orderBy(desc(sessions.startedAt))
        .get();
}
export function setSessionIntent(id, intent) {
    const existing = getDb().select().from(sessions).where(eq(sessions.id, id)).get();
    if (!existing)
        throw new Error(`Session not found: ${id}`);
    getDb().update(sessions).set({ intent }).where(eq(sessions.id, id)).run();
}
export function getLatestSessionInfoByThreadIds(threadIds) {
    if (threadIds.length === 0)
        return new Map();
    const rows = getDb()
        .select({ threadId: sessions.threadId, folderName: sessions.folderName, githubUrl: sessions.githubUrl })
        .from(sessions)
        .where(inArray(sessions.threadId, threadIds))
        .orderBy(desc(sessions.startedAt))
        .all();
    const map = new Map();
    for (const row of rows) {
        if (row.threadId && !map.has(row.threadId)) {
            map.set(row.threadId, { folderName: row.folderName ?? null, githubUrl: row.githubUrl ?? null });
        }
    }
    return map;
}
export function backfillNullThreadSessions(projectPath, threadId) {
    getDb()
        .update(sessions)
        .set({ threadId })
        .where(and(eq(sessions.projectPath, projectPath), isNull(sessions.threadId)))
        .run();
}
//# sourceMappingURL=sessions.js.map