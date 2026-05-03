import { Command } from 'commander'
import { handleClaudeStart, handleClaudeStop } from '../../hooks/claude-code.js'
import { handleCodexStop } from '../../hooks/codex.js'
import { handleOpencodeStop } from '../../hooks/opencode.js'
import { handleGitPostCommit } from '../../hooks/git.js'
import { appendHookLog } from '../../hooks/common.js'

const EVENTS = [
  'claude-pre-tool-use',
  'claude-stop',
  'codex-stop',
  'opencode-stop',
  'git-post-commit',
] as const
type HookEvent = (typeof EVENTS)[number]

export function register(program: Command): void {
  program
    .command('hook <event>')
    .description('Internal hook dispatcher — called by agent hooks')
    .option('--stdin <json>', 'JSON payload (overrides process.stdin)')
    .option('--cwd <path>', 'Working directory override')
    .action((event: string, opts: { stdin?: string; cwd?: string }) => {
      const cwd = opts.cwd ?? process.cwd()
      const raw = opts.stdin ?? ''

      if (!EVENTS.includes(event as HookEvent)) {
        appendHookLog(`hook: unknown event "${event}"`)
        return
      }

      switch (event as HookEvent) {
        case 'claude-pre-tool-use':
          handleClaudeStart(null, cwd)
          break
        case 'claude-stop':
          handleClaudeStop(raw, cwd)
          break
        case 'codex-stop':
          handleCodexStop(cwd)
          break
        case 'opencode-stop':
          handleOpencodeStop(raw)
          break
        case 'git-post-commit':
          handleGitPostCommit(cwd)
          break
      }
    })
}
