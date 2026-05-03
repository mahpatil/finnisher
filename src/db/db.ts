import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { join } from 'path'
import { homedir } from 'os'
import { mkdirSync } from 'fs'
import * as schema from './schema.js'

const DEFAULT_DB_PATH = join(homedir(), '.finnisher', 'db.sqlite')

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

let _db: DrizzleDb | null = null
let _sqlite: InstanceType<typeof Database> | null = null

export function getDb(dbPath?: string): DrizzleDb {
  if (_db) return _db

  const path = dbPath ?? process.env['FINNISHER_DB_PATH'] ?? DEFAULT_DB_PATH
  mkdirSync(join(path, '..'), { recursive: true })

  _sqlite = new Database(path)
  _sqlite.pragma('journal_mode = WAL')
  _sqlite.pragma('foreign_keys = ON')

  _db = drizzle(_sqlite, { schema })
  return _db
}

export function getSqlite(): InstanceType<typeof Database> {
  if (!_sqlite) throw new Error('DB not initialized — call getDb() first')
  return _sqlite
}

export function _resetDb(): void {
  _sqlite?.close()
  _sqlite = null
  _db = null
}
