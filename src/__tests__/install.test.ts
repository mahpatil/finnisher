import { execSync, spawnSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

const SCRIPT = path.resolve(process.cwd(), 'install.sh')

function runScript(env: Record<string, string> = {}) {
  return spawnSync('sh', [SCRIPT], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 10000,
  })
}

function runScriptWithPath(pathOverride: string) {
  return spawnSync('sh', [SCRIPT], {
    env: { ...process.env, PATH: pathOverride },
    encoding: 'utf8',
    timeout: 10000,
  })
}

// ── Criterion 3: Node.js not installed ────────────────────────────────────────

describe('install.sh — no node', () => {
  it('prints clear error with nodejs.org URL and exits 1 when node not on PATH', () => {
    const result = runScriptWithPath('/usr/bin:/bin')
    expect(result.status).toBe(1)
    expect(result.stdout + result.stderr).toContain('Node.js')
    expect(result.stdout + result.stderr).toContain('nodejs.org')
  })
})

// ── Criterion 3b: Node.js too old ─────────────────────────────────────────────

describe('install.sh — node too old', () => {
  it('prints version error and exits 1 when NODE_MAJOR is below 18', () => {
    const fakeNodeDir = path.resolve(process.cwd(), 'src/__tests__/fake-bin')
    const result = spawnSync('sh', [SCRIPT], {
      env: { ...process.env, PATH: `${fakeNodeDir}:${process.env['PATH'] ?? ''}`, FAKE_NODE_VERSION: '16' },
      encoding: 'utf8',
      timeout: 10000,
    })
    expect(result.status).toBe(1)
    expect(result.stdout + result.stderr).toContain('18')
  })
})

// ── Criterion 5: success message ─────────────────────────────────────────────

describe('install.sh — success output format', () => {
  it('script contains finn add and finn web in success message', () => {
    const content = require('fs').readFileSync(SCRIPT, 'utf8') as string
    expect(content).toContain('finn add')
    expect(content).toContain('finn web')
    expect(content).toContain('.finn-thread')
  })
})

// ── Criterion 6: npm failure message ──────────────────────────────────────────

describe('install.sh — npm failure handling', () => {
  it('script contains sudo fallback message', () => {
    const content = require('fs').readFileSync(SCRIPT, 'utf8') as string
    expect(content).toContain('sudo')
  })
})

// ── Criterion: script exists and is executable ────────────────────────────────

describe('install.sh — file properties', () => {
  it('script file exists at repo root', () => {
    expect(existsSync(SCRIPT)).toBe(true)
  })

  it('script is POSIX sh (no bash-specific syntax)', () => {
    const content = require('fs').readFileSync(SCRIPT, 'utf8') as string
    expect(content.startsWith('#!/bin/sh')).toBe(true)
  })

  it('script has LF line endings', () => {
    const raw = require('fs').readFileSync(SCRIPT) as Buffer
    expect(raw.includes(Buffer.from('\r\n'))).toBe(false)
  })
})
