import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export function register(program) {
    program
        .command('web')
        .description('Start the web dashboard on http://localhost:3141')
        .action(() => {
        const webDir = path.resolve(__dirname, '../../src/web');
        const child = spawn('npx', ['next', 'dev', '--port', '3141'], {
            cwd: webDir,
            stdio: 'inherit',
            shell: true,
        });
        child.on('error', err => console.error('Failed to start web server:', err));
    });
}
//# sourceMappingURL=web.js.map