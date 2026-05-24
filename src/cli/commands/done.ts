import type { Command } from 'commander'
import { getThread, updateState, listThreads, overloadWarning } from '../../db/threads.js'
import { durationStr, printFocusWarning } from '../ui/format.js'

export function register(program: Command): void {
  program
    .command('done <id>')
    .description('Mark a thread as done')
    .action((id: string) => {
      const thread = getThread(id)
      if (!thread) {
        console.error(`Error: Thread not found: ${id}`)
        process.exitCode = 1
        process.exit()
      }
      updateState(id, 'closed')
      const elapsed = Date.now() - thread.createdAt.getTime()
      console.log(`✓ Done. Completed in ${durationStr(elapsed)}`)

      const all = listThreads()
      const warning = overloadWarning(all)
      if (warning) printFocusWarning(warning)
    })
}
