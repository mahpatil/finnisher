import { describe, it, expect, vi, beforeEach } from 'vitest'
import { stateBadge, stalledBadge, durationStr, costStr, printFocusWarning } from '../ui/format.js'
import type { Thread } from '../../db/schema.js'
import type { FocusWarning } from '../../db/threads.js'

function makeThread(overrides: Partial<Thread> = {}): Thread {
  const now = new Date()
  return {
    id: 'abc123xyz0',
    title: 'Test Thread',
    state: 'open',
    nextAction: 'Do something',
    owner: 'you',
    priority: 'later',
    notes: null,
    momentum: 0,
    stalled: false,
    lastVelocity: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
    ...overrides,
  }
}

describe('stateBadge', () => {
  it('returns colored string for each state', () => {
    expect(stateBadge('new')).toContain('new')
    expect(stateBadge('open')).toContain('open')
    expect(stateBadge('waiting')).toContain('waiting')
    expect(stateBadge('blocked')).toContain('blocked')
    expect(stateBadge('closed')).toContain('closed')
    expect(stateBadge('archived')).toContain('archived')
  })
})

describe('stalledBadge', () => {
  it('returns a string containing STALLED', () => {
    expect(stalledBadge()).toContain('STALLED')
  })
})

describe('durationStr', () => {
  it('returns hours and minutes for multi-hour durations', () => {
    expect(durationStr(2 * 60 * 60 * 1000 + 14 * 60 * 1000)).toBe('2h 14m')
  })

  it('returns only minutes for sub-hour durations', () => {
    expect(durationStr(30 * 60 * 1000)).toBe('30m')
  })

  it('returns <1m for very short durations', () => {
    expect(durationStr(500)).toBe('<1m')
  })

  it('handles zero', () => {
    expect(durationStr(0)).toBe('<1m')
  })

  it('handles exactly 1 hour', () => {
    expect(durationStr(60 * 60 * 1000)).toBe('1h 0m')
  })
})

describe('costStr', () => {
  it('formats cost with $ prefix and 2 decimal places', () => {
    expect(costStr(0.12)).toBe('$0.12')
  })

  it('returns em dash for null', () => {
    expect(costStr(null)).toBe('—')
  })

  it('returns em dash for undefined-like null', () => {
    expect(costStr(null)).toBe('—')
  })

  it('formats zero cost', () => {
    expect(costStr(0)).toBe('$0.00')
  })
})

describe('printFocusWarning', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('prints warning with caution icon for caution level', () => {
    const w: FocusWarning = {
      level: 'caution',
      count: 6,
      message: 'test',
      suggestions: [makeThread({ title: 'Ship Rust prototype' })],
    }
    printFocusWarning(w)
    const calls = (console.log as ReturnType<typeof vi.spyOn>).mock.calls.map(c => c[0] as string).join('\n')
    expect(calls).toContain('6 active threads')
    expect(calls).toContain('Ship Rust prototype')
    expect(calls).toContain('finn done <id>')
  })

  it('uses red/stop sign for urgent level', () => {
    const w: FocusWarning = {
      level: 'urgent',
      count: 9,
      message: 'test',
      suggestions: [makeThread()],
    }
    printFocusWarning(w)
    const calls = (console.log as ReturnType<typeof vi.spyOn>).mock.calls.map(c => c[0] as string).join('\n')
    expect(calls).toContain('9 active threads')
    expect(calls).toContain('finn done <id>')
  })

  it('marks stalled threads in suggestions', () => {
    const staleDate = new Date(Date.now() - 49 * 60 * 60 * 1000)
    const w: FocusWarning = {
      level: 'caution',
      count: 6,
      message: 'test',
      suggestions: [makeThread({ updatedAt: staleDate })],
    }
    printFocusWarning(w)
    const calls = (console.log as ReturnType<typeof vi.spyOn>).mock.calls.map(c => c[0] as string).join('\n')
    expect(calls).toContain('stalled')
  })
})
