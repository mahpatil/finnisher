import { eq, count } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { getDb } from './db.js';
import { launchCriteria } from './schema.js';
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 10);
export function getLaunchCriteria(threadId) {
    return getDb()
        .select()
        .from(launchCriteria)
        .where(eq(launchCriteria.threadId, threadId))
        .orderBy(launchCriteria.position)
        .all();
}
export function addLaunchCriterion(threadId, text) {
    const existing = getDb()
        .select({ n: count() })
        .from(launchCriteria)
        .where(eq(launchCriteria.threadId, threadId))
        .get();
    const position = (existing?.n ?? 0);
    const row = {
        id: nanoid(10),
        threadId,
        text,
        checked: false,
        position,
        createdAt: new Date(),
        checkedAt: null,
    };
    getDb().insert(launchCriteria).values(row).run();
    return getDb().select().from(launchCriteria).where(eq(launchCriteria.id, row.id)).get();
}
export function toggleLaunchCriterion(id, checked) {
    getDb()
        .update(launchCriteria)
        .set({ checked, checkedAt: checked ? new Date() : null })
        .where(eq(launchCriteria.id, id))
        .run();
}
export function deleteLaunchCriterion(id) {
    getDb().delete(launchCriteria).where(eq(launchCriteria.id, id)).run();
}
export function isLaunchReady(threadId) {
    const criteria = getLaunchCriteria(threadId);
    return criteria.length > 0 && criteria.every(c => c.checked);
}
//# sourceMappingURL=launchCriteria.js.map