import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { existsSync, rmSync } from 'fs'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

afterEach(async () => {
  const { _resetDb } = await import('../db.js')
  _resetDb()
  vi.resetModules()
})

describe('runMigrations', () => {
  it('creates the schema on a fresh DB', async () => {
    const dbPath = tempDbPath()
    process.env['FINNISHER_DB_PATH'] = dbPath
    vi.resetModules()

    const { runMigrations } = await import('../migrate.js')
    expect(() => runMigrations()).not.toThrow()

    const { getSqlite } = await import('../db.js')
    const tables = getSqlite()
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[]
    const names = tables.map(t => t.name)
    expect(names).toContain('threads')
    expect(names).toContain('sessions')

    const { _resetDb } = await import('../db.js')
    _resetDb()
    rmSync(join(dbPath, '..'), { recursive: true })
  })

  it('is idempotent — calling twice does not throw', async () => {
    const dbPath = tempDbPath()
    process.env['FINNISHER_DB_PATH'] = dbPath
    vi.resetModules()

    const { runMigrations } = await import('../migrate.js')
    runMigrations()
    expect(() => runMigrations()).not.toThrow()

    const { _resetDb } = await import('../db.js')
    _resetDb()
    rmSync(join(dbPath, '..'), { recursive: true })
  })
})
