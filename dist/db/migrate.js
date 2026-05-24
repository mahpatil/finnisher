import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { getDb, getSqlite } from './db.js';
const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
export function runMigrations() {
    const db = getDb();
    // PRAGMA foreign_keys inside a transaction is a no-op in SQLite. Migration 0003
    // drops and recreates the threads table while sessions/blockers have FK references.
    // Disabling FK here (outside any transaction) lets the table recreate proceed safely.
    getSqlite().pragma('foreign_keys = OFF');
    try {
        migrate(db, { migrationsFolder });
    }
    finally {
        getSqlite().pragma('foreign_keys = ON');
    }
}
//# sourceMappingURL=migrate.js.map