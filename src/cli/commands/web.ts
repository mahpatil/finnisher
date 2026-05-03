import type { Command } from 'commander'

export function register(program: Command): void {
  program
    .command('web')
    .description('Start the web dashboard (Phase 4)')
    .action(() => {
      console.log('finn web coming in Phase 4')
    })
}
