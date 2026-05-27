import type { Command } from 'commander'
import * as p from '@clack/prompts'
import { createThread, listThreads, overloadWarning } from '../../db/threads.js'
import type { ThreadState, ThreadOwner } from '../../db/schema.js'
import { printFocusWarning } from '../ui/format.js'
import { getAbandonCandidates } from '../ui/abandonCheck.js'
import { readConfig } from '../../lib/config.js'

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

      const config = readConfig()
      const stallMs = config.stall_hours * 3600 * 1000
      const candidates = getAbandonCandidates(listThreads(), stallMs)

      if (candidates.length >= 2) {
        const opts2 = [
          ...candidates.map(t => ({
            value: t.id,
            label: `${t.title} — last touched ${Math.round((Date.now() - t.updatedAt.getTime()) / 3600000)}h ago`,
            hint: t.nextAction,
          })),
          { value: '__proceed__', label: 'Proceed — add new thread' },
        ]
        const pick = await p.select({
          message: 'Any of these closer to done than your new idea?',
          options: opts2,
        })
        if (p.isCancel(pick) || pick === '__proceed__') {
          // fall through to the normal add flow
        } else {
          const chosen = candidates.find(t => t.id === pick)
          console.log(`Refocus: finn next ${pick} "<next action>"`)
          if (chosen) console.log(`  → ${chosen.title}: ${chosen.nextAction}`)
          return
        }
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
