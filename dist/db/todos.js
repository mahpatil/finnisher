import { eq, asc, inArray, sql } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { getDb } from './db.js';
import { threadTodos } from './schema.js';
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 10);
export function createTodo(threadId, text) {
    const db = getDb();
    const now = new Date();
    const id = nanoid();
    db.insert(threadTodos).values({
        id,
        threadId,
        text,
        done: false,
        position: now.getTime(),
        createdAt: now,
        completedAt: null,
    }).run();
    return db.select().from(threadTodos).where(eq(threadTodos.id, id)).get();
}
export function listTodos(threadId) {
    return getDb()
        .select()
        .from(threadTodos)
        .where(eq(threadTodos.threadId, threadId))
        .orderBy(asc(threadTodos.createdAt))
        .all();
}
export function updateTodo(id, patch) {
    const db = getDb();
    const existing = db.select().from(threadTodos).where(eq(threadTodos.id, id)).get();
    if (!existing)
        throw new Error(`Todo not found: ${id}`);
    const updates = {};
    if (patch.text !== undefined)
        updates.text = patch.text;
    if (patch.done !== undefined) {
        updates.done = patch.done;
        updates.completedAt = patch.done ? new Date() : null;
    }
    db.update(threadTodos).set(updates).where(eq(threadTodos.id, id)).run();
    return db.select().from(threadTodos).where(eq(threadTodos.id, id)).get();
}
export function deleteTodo(id) {
    getDb().delete(threadTodos).where(eq(threadTodos.id, id)).run();
}
export function listTodoCounts(threadIds) {
    if (threadIds.length === 0)
        return {};
    const rows = getDb()
        .select({
        threadId: threadTodos.threadId,
        total: sql `count(*)`.as('total'),
        done: sql `sum(case when ${threadTodos.done} = 1 then 1 else 0 end)`.as('done'),
    })
        .from(threadTodos)
        .where(inArray(threadTodos.threadId, threadIds))
        .groupBy(threadTodos.threadId)
        .all();
    const result = {};
    for (const id of threadIds) {
        result[id] = { done: 0, total: 0 };
    }
    for (const row of rows) {
        result[row.threadId] = { done: Number(row.done ?? 0), total: Number(row.total) };
    }
    return result;
}
//# sourceMappingURL=todos.js.map