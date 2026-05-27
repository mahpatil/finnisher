import type { Command } from 'commander'
import * as p from '@clack/prompts'
import { getThread } from '../../db/threads.js'
import {
  getLaunchCriteria,
  addLaunchCriterion,
  toggleLaunchCriterion,
  isLaunchReady,
} from '../../db/launchCriteria.js'

export function register(program: Command): void {
  program
    .command('launch <id>')
    .description('View or set launch criteria for a thread')
    .option('--check <n>', 'Toggle criterion N (1-indexed)')
    .action(async (id: string, opts: { check?: string }) => {
      const thread = getThread(id)
      if (!thread) {
        console.error(`Thread not found: ${id}`)
        return
      }

      if (opts.check) {
        const idx = parseInt(opts.check, 10) - 1
        const criteria = getLaunchCriteria(id)
        const target = criteria[idx]
        if (!target) {
          console.error(`No criterion at position ${opts.check}`)
          return
        }
        toggleLaunchCriterion(target.id, !target.checked)
        const label = !target.checked ? '✓ checked' : '○ unchecked'
        console.log(`  ${label}: ${target.text}`)
        return
      }

      const existing = getLaunchCriteria(id)

      if (existing.length > 0) {
        console.log(`\n  Launch Gate — ${thread.title}`)
        for (const [i, c] of existing.entries()) {
          const mark = c.checked ? '✓' : '○'
          console.log(`  ${mark} ${i + 1}. ${c.text}`)
        }
        const ready = isLaunchReady(id)
        console.log(ready ? '\n  ✦ All criteria met — ready to ship!' : '')
        console.log()
      }

      p.intro(`Launch Gate — ${thread.title}`)

      let position = existing.length
      while (true) {
        const input = await p.text({
          message: position === 0
            ? 'What does shipping this look like? Add a criterion (empty to finish)'
            : 'Add another criterion (empty to finish)',
        })
        if (p.isCancel(input) || !input || (input as string).trim() === '') break
        addLaunchCriterion(id, (input as string).trim())
        position++
      }

      const final = getLaunchCriteria(id)
      if (final.length > 0) {
        p.outro(`${final.length} criteria set. Use: finn launch ${id} --check <N> to toggle.`)
      } else {
        p.outro('No criteria set.')
      }
    })
}
