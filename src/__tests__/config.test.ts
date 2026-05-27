import { describe, it, expect, afterEach } from 'vitest'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { mkdirSync, writeFileSync } from 'fs'

function tempHome() {
  const p = join(tmpdir(), 'finn-config-test-' + randomBytes(4).toString('hex'))
  mkdirSync(p, { recursive: true })
  return p
}

afterEach(() => {
  delete process.env['FINNISHER_HOME']
})

describe('readConfig', () => {
  it('returns default stall_hours=48 when no config file exists', async () => {
    const home = tempHome()
    process.env['FINNISHER_HOME'] = home
    const { readConfig } = await import('../lib/config.js')
    expect(readConfig().stall_hours).toBe(48)
  })

  it('returns stall_hours from config file when set', async () => {
    const home = tempHome()
    process.env['FINNISHER_HOME'] = home
    const dir = join(home, '.finnisher')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ stall_hours: 72 }))
    const { readConfig } = await import('../lib/config.js')
    expect(readConfig().stall_hours).toBe(72)
  })

  it('returns defaults when config file contains malformed JSON', async () => {
    const home = tempHome()
    process.env['FINNISHER_HOME'] = home
    const dir = join(home, '.finnisher')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'config.json'), 'not-json{{{')
    const { readConfig } = await import('../lib/config.js')
    expect(readConfig().stall_hours).toBe(48)
  })
})
