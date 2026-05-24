import type { Command } from 'commander'
import { getThread, archiveThread, unarchiveThread } from '../../db/threads.js'

export function register(program: Command): void {
  program
    .command('archive <id>')
    .description('Archive a thread (hides from default list)')
    .action((id: string) => {
      const thread = getThread(id)
      if (!thread) {
        console.error(`Error: Thread not found: ${id}`)
        process.exitCode = 1
        process.exit()
      }
      if (thread.state === 'archived') {
        console.log(`Thread is already archived`)
        return
      }
      archiveThread(id)
      console.log(`✓ Thread ${id} archived`)
    })

  program
    .command('unarchive <id>')
    .description('Unarchive a thread (moves back to open)')
    .action((id: string) => {
      const thread = getThread(id)
      if (!thread) {
        console.error(`Error: Thread not found: ${id}`)
        process.exitCode = 1
        process.exit()
      }
      if (thread.state !== 'archived') {
        console.error(`Error: Thread is not archived`)
        process.exitCode = 1
        process.exit()
      }
      unarchiveThread(id)
      console.log(`✓ Thread ${id} unarchived`)
    })
}
