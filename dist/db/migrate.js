import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { getDb } from './db.js';
const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
export function runMigrations() {
    migrate(getDb(), { migrationsFolder });
}
//# sourceMappingURL=migrate.js.map