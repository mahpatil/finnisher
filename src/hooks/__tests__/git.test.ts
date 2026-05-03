import { describe, it, expect, afterEach, vi } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { mkdirSync, writeFileSync } from 'fs'

function tempDbPath() {
  return join(tmpdir(), 'finnisher-test-' + randomBytes(4).toString('hex'), 'db.sqlite')
}

async function setup() {
  const dbPath = tempDbPath()
  process.env['FINNISHER_DB_PATH'] = dbPath
  vi.resetModules()
  const { runMigrations } = await import('../../db/migrate.js')
  runMigrations()
  const threads = await import('../../db/threads.js')
  const { handleGitPostCommit } = await import('../git.js')
  return { ...threads, handleGitPostCommit, dbPath }
}

afterEach(async () => {
  const { _resetDb } = await import('../../db/db.js')
  _resetDb()
  vi.resetModules()
})

describe('handleGitPostCommit', () => {
  it('bumps updatedAt when .finn-thread exists and thread is active', async () => {
    const { createThread, getThread, handleGitPostCommit } = await setup()
    const t = createThread({ title: 'T', nextAction: 'N', state: 'active', owner: 'you' })
    const before = t.updatedAt.getTime()

    await new Promise(r => setTimeout(r, 5))

    const dir = join(tmpdir(), 'finn-git-test-' + randomBytes(4).toString('hex'))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, '.finn-thread'), t.id)

    handleGitPostCommit(dir)

    const after = getThread(t.id)!
    expect(after.updatedAt.getTime()).toBeGreaterThan(before)
  })

  it('exits silently when .finn-thread is absent', async () => {
    const { handleGitPostCommit } = await setup()
    const dir = join(tmpdir(), 'finn-git-test-' + randomBytes(4).toString('hex'))
    mkdirSync(dir, { recursive: true })
    expect(() => handleGitPostCommit(dir)).not.toThrow()
  })

  it('exits silently when thread id does not exist in DB', async () => {
    const { handleGitPostCommit } = await setup()
    const dir = join(tmpdir(), 'finn-git-test-' + randomBytes(4).toString('hex'))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, '.finn-thread'), 'nonexistent0')
    expect(() => handleGitPostCommit(dir)).not.toThrow()
  })
})
