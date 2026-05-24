import { and, desc, eq, isNull } from 'drizzle-orm';
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
    return getDb().select().from(sessions).where(isNull(sessions.endedAt)).all();
}
//# sourceMappingURL=sessions.js.map