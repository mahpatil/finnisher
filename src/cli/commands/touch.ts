import type { Command } from 'commander'
import { touchThread } from '../../db/threads.js'

export function register(program: Command): void {
  program
    .command('touch <id>')
    .description('Touch a thread (hooks only)')
    .action((id: string) => {
      try {
        touchThread(id)
      } catch {
        // Silently ignore errors — touch must never block hooks
      }
    })
}
