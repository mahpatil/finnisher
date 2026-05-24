import type { Command } from 'commander'
import { getThread, updatePriority } from '../../db/threads.js'
import { THREAD_PRIORITIES } from '../../db/schema.js'
import type { ThreadPriority } from '../../db/schema.js'

export function register(program: Command): void {
  program
    .command('priority <id> <priority>')
    .description('Set thread priority (now|next|later|out)')
    .action((id: string, priority: string) => {
      if (!THREAD_PRIORITIES.includes(priority as ThreadPriority)) {
        console.error(`Error: Invalid priority "${priority}". Valid: ${THREAD_PRIORITIES.join(', ')}`)
        process.exitCode = 1
        process.exit()
      }
      const thread = getThread(id)
      if (!thread) {
        console.error(`Error: Thread not found: ${id}`)
        process.exitCode = 1
        process.exit()
      }
      updatePriority(id, priority as ThreadPriority)
      console.log(`✓ Thread ${id} priority set to ${priority}`)
    })
}
