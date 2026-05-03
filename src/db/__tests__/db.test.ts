import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

function tempDbPath(): string {
  const dir = join(tmpdir(), 'finnisher-test-' + randomBytes(4).toString('hex'))
  return join(dir, 'db.sqlite')
}

describe('getDb', () => {
  let dbPath: string

  beforeEach(() => {
    dbPath = tempDbPath()
    process.env['FINNISHER_DB_PATH'] = dbPath
    vi.resetModules()
  })

  afterEach(async () => {
    const { _resetDb } = await import('../db.js')
    _resetDb()
    vi.resetModules()
    const dir = join(dbPath, '..')
    if (existsSync(dir)) rmSync(dir, { recursive: true })
  })

  it('creates the DB directory and file on first call', async () => {
    const { getDb } = await import('../db.js')
    getDb()
    expect(existsSync(dbPath)).toBe(true)
  })

  it('returns the same instance on subsequent calls', async () => {
    const { getDb } = await import('../db.js')
    const db1 = getDb()
    const db2 = getDb()
    expect(db1).toBe(db2)
  })

  it('enables WAL journal mode', async () => {
    const { getDb, getSqlite } = await import('../db.js')
    getDb()
    const result = getSqlite().pragma('journal_mode', { simple: true })
    expect(result).toBe('wal')
  })

  it('enables foreign keys', async () => {
    const { getDb, getSqlite } = await import('../db.js')
    getDb()
    const result = getSqlite().pragma('foreign_keys', { simple: true })
    expect(result).toBe(1)
  })
})
