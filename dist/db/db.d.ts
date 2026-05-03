import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
export declare function getDb(dbPath?: string): DrizzleDb;
export declare function getSqlite(): InstanceType<typeof Database>;
export declare function _resetDb(): void;
export {};
//# sourceMappingURL=db.d.ts.map