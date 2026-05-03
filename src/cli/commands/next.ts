import type { Command } from 'commander'
import { getThread, updateNextAction } from '../../db/threads.js'

export function register(program: Command): void {
  program
    .command('next <id> <action>')
    .description('Update the next action for a thread')
    .action((id: string, action: string) => {
      const thread = getThread(id)
      if (!thread) {
        console.error(`Error: Thread not found: ${id}`)
        process.exitCode = 1
        process.exit()
      }
      updateNextAction(id, action)
      console.log('✓ Next action updated')
    })
}
