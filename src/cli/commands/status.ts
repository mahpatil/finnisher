import type { Command } from 'commander'
import { getThread, updateState, listThreads, overloadWarning } from '../../db/threads.js'
import { THREAD_STATES } from '../../db/schema.js'
import type { ThreadState } from '../../db/schema.js'
import { printFocusWarning } from '../ui/format.js'

export function register(program: Command): void {
  program
    .command('status <id> <state>')
    .description('Update thread state')
    .action((id: string, state: string) => {
      if (!THREAD_STATES.includes(state as ThreadState)) {
        console.error(`Error: Invalid state "${state}". Valid states: ${THREAD_STATES.join(', ')}`)
        process.exitCode = 1
        process.exit()
      }
      const thread = getThread(id)
      if (!thread) {
        console.error(`Error: Thread not found: ${id}`)
        process.exitCode = 1
        process.exit()
      }
      updateState(id, state as ThreadState)
      console.log(`✓ Thread ${id} state set to ${state}`)

      const all = listThreads()
      const warning = overloadWarning(all)
      if (warning) printFocusWarning(warning)
    })
}
