import type { Command } from 'commander'
import * as p from '@clack/prompts'
import { createThread, listThreads, overloadWarning } from '../../db/threads.js'
import type { ThreadState, ThreadOwner } from '../../db/schema.js'
import { printFocusWarning } from '../ui/format.js'

export function register(program: Command): void {
  program
    .command('add')
    .description('Add a new thread')
    .option('--title <title>', 'Thread title')
    .option('--next <action>', 'Next action')
    .action(async (opts: { title?: string; next?: string }) => {
      if (opts.title && opts.next) {
        const thread = createThread({
          title: opts.title,
          nextAction: opts.next,
          state: 'open',
          owner: 'you',
        })
        console.log(`Created thread: ${thread.id}`)
        const all = listThreads()
        const warning = overloadWarning(all)
        if (warning) printFocusWarning(warning)
        return
      }

      p.intro('Add a new thread')

      const title = await p.text({
        message: 'Title',
        validate: (v) => v.trim().length === 0 ? 'Title is required' : undefined,
      })
      if (p.isCancel(title)) { console.log('Cancelled.'); process.exit(0) }

      const nextAction = await p.text({
        message: 'Next action',
        validate: (v) => v.trim().length === 0 ? 'Next action is required' : undefined,
      })
      if (p.isCancel(nextAction)) { console.log('Cancelled.'); process.exit(0) }

      const owner = await p.select<ThreadOwner>({
        message: 'Owner',
        options: [
          { value: 'you', label: 'You' },
          { value: 'ai_agent', label: 'AI Agent' },
          { value: 'other', label: 'Other' },
        ],
        initialValue: 'you',
      })
      if (p.isCancel(owner)) { console.log('Cancelled.'); process.exit(0) }

      const state = await p.select<ThreadState>({
        message: 'State',
        options: [
          { value: 'new', label: 'New' },
          { value: 'open', label: 'Open' },
          { value: 'waiting', label: 'Waiting' },
          { value: 'blocked', label: 'Blocked' },
        ],
        initialValue: 'open',
      })
      if (p.isCancel(state)) { console.log('Cancelled.'); process.exit(0) }

      const thread = createThread({
        title: title as string,
        nextAction: nextAction as string,
        owner: owner as ThreadOwner,
        state: state as ThreadState,
      })

      p.outro(`Created thread: ${thread.id}`)

      const all = listThreads()
      const warning = overloadWarning(all)
      if (warning) printFocusWarning(warning)
    })
}
