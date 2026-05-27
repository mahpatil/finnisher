import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export interface FinnConfig {
  stall_hours: number
}

const DEFAULTS: FinnConfig = {
  stall_hours: 48,
}

function getFinnisherHome(): string {
  return process.env['FINNISHER_HOME'] ?? homedir()
}

export function readConfig(): FinnConfig {
  const configPath = join(getFinnisherHome(), '.finnisher', 'config.json')
  if (!existsSync(configPath)) return { ...DEFAULTS }
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>
    return {
      stall_hours: typeof raw['stall_hours'] === 'number' ? raw['stall_hours'] : DEFAULTS.stall_hours,
    }
  } catch {
    return { ...DEFAULTS }
  }
}
