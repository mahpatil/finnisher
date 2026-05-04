import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { homedir } from 'os';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const finnDir = path.join(homedir(), '.finnisher');
const pidFile = path.join(finnDir, 'web.pid');
function hasWebDeps() {
    try {
        require.resolve('next');
        return true;
    }
    catch {
        return false;
    }
}
function startWeb() {
    if (!hasWebDeps()) {
        console.error('finn web requires optional web dependencies. Install them with:');
        console.error('');
        console.error('  npm install -g next react react-dom @mui/material @mui/icons-material @mui/material-nextjs @emotion/react @emotion/styled swr');
        process.exit(1);
    }
    // dist/cli/commands/ → three levels up to package root, then src/web
    const webDir = path.resolve(__dirname, '../../../src/web');
    if (!existsSync(webDir)) {
        console.error(`Web directory not found: ${webDir}`);
        console.error('Run from the repo checkout with: npm run dev');
        process.exit(1);
    }
    console.log('Starting dashboard at http://localhost:3141 ...');
    const child = spawn('npx', ['next', 'dev', '--port', '3141'], {
        cwd: webDir,
        stdio: 'inherit',
        detached: true,
    });
    if (child.pid !== undefined) {
        mkdirSync(finnDir, { recursive: true });
        writeFileSync(pidFile, String(child.pid));
    }
    const cleanup = () => {
        try {
            unlinkSync(pidFile);
        }
        catch { /* ignore */ }
    };
    child.on('exit', cleanup);
    child.on('error', err => console.error('Failed to start web server:', err));
}
function stopWeb() {
    if (!existsSync(pidFile)) {
        console.error('No running web dashboard found.');
        process.exit(1);
    }
    const raw = readFileSync(pidFile, 'utf8').trim();
    const pid = parseInt(raw, 10);
    if (isNaN(pid)) {
        console.error('Invalid PID file.');
        try {
            unlinkSync(pidFile);
        }
        catch { /* ignore */ }
        process.exit(1);
    }
    try {
        // Kill the process group (spawned with detached: true)
        process.kill(-pid, 'SIGTERM');
    }
    catch (err) {
        const code = err instanceof Error && 'code' in err
            ? err.code
            : undefined;
        if (code !== 'ESRCH') {
            // ESRCH means process already gone — still clean up
            console.error('Failed to stop web dashboard:', err);
            process.exit(1);
        }
    }
    // Also kill child processes by port as a fallback
    try {
        execSync('lsof -ti:3141 | xargs kill -TERM 2>/dev/null', { stdio: 'ignore' });
    }
    catch { /* ignore */ }
    try {
        unlinkSync(pidFile);
    }
    catch { /* ignore */ }
    console.log('Web dashboard stopped.');
}
export function register(program) {
    const web = program
        .command('web')
        .description('Start the web dashboard on http://localhost:3141')
        .action(startWeb);
    web
        .command('stop')
        .description('Stop the running web dashboard')
        .action(stopWeb);
}
//# sourceMappingURL=web.js.map