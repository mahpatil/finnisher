import type { Command } from 'commander'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function hasWebDeps(): boolean {
  try {
    require.resolve('next')
    return true
  } catch {
    return false
  }
}

export function register(program: Command): void {
  program
    .command('web')
    .description('Start the web dashboard on http://localhost:3141')
    .action(() => {
      if (!hasWebDeps()) {
        console.error('finn web requires optional web dependencies. Install them with:')
        console.error('')
        console.error('  npm install -g next react react-dom @mui/material @mui/icons-material @mui/material-nextjs @emotion/react @emotion/styled swr')
        process.exit(1)
      }

      const webDir = path.resolve(__dirname, '../../src/web')
      const child = spawn('npx', ['next', 'dev', '--port', '3141'], {
        cwd: webDir,
        stdio: 'inherit',
        shell: true,
      })
      child.on('error', err => console.error('Failed to start web server:', err))
    })
}
