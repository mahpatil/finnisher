import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync, openSync } from 'fs';
import { homedir } from 'os';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const finnDir = path.join(homedir(), '.finnisher');
const pidFile = path.join(finnDir, 'web.pid');
const logFile = path.join(finnDir, 'web.log');
// dist/cli/commands/ → three levels up to package root
const pkgRoot = path.resolve(__dirname, '../../..');
const webDir = path.join(pkgRoot, 'src/web');
// Use the next binary from the package's own node_modules (works in global install)
const nextBin = path.join(pkgRoot, 'node_modules/.bin/next');
function resolveNext() {
    if (existsSync(nextBin))
        return { cmd: nextBin, args: ['dev', '--port', '3141'] };
    // Fallback: npx in case node_modules layout differs
    return { cmd: 'npx', args: ['next', 'dev', '--port', '3141'] };
}
function isRunning() {
    if (!existsSync(pidFile))
        return null;
    const raw = readFileSync(pidFile, 'utf8').trim();
    const pid = parseInt(raw, 10);
    if (isNaN(pid))
        return null;
    try {
        process.kill(pid, 0); // signal 0 = existence check only
        return pid;
    }
    catch {
        return null;
    }
}
function startWeb() {
    const running = isRunning();
    if (running !== null) {
        console.log(`Dashboard already running (PID ${running}) at http://localhost:3141`);
        console.log(`  Stop: finn web stop`);
        return;
    }
    if (!existsSync(webDir)) {
        console.error(`Web directory not found: ${webDir}`);
        console.error('Reinstall with: npm install -g github:mahpatil/finnisher');
        process.exit(1);
    }
    const { cmd, args } = resolveNext();
    mkdirSync(finnDir, { recursive: true });
    const logFd = openSync(logFile, 'a');
    const child = spawn(cmd, args, {
        cwd: webDir,
        stdio: ['ignore', logFd, logFd],
        detached: true,
        env: { ...process.env, FINNISHER_WEB: '1' },
    });
    child.unref();
    if (child.pid !== undefined) {
        writeFileSync(pidFile, String(child.pid));
    }
    child.on('error', err => {
        try {
            unlinkSync(pidFile);
        }
        catch { /* ignore */ }
        console.error('Failed to start web server:', err.message);
        console.error('Try: npm install -g github:mahpatil/finnisher');
    });
    console.log('Dashboard starting at http://localhost:3141 (give it ~10s to boot)');
    console.log(`  Logs: ${logFile}`);
    console.log(`  Stop: finn web stop`);
}
function stopWeb() {
    const pid = isRunning();
    if (pid === null) {
        // Try port-based kill as fallback even without PID file
        try {
            execSync('lsof -ti:3141 | xargs kill -TERM 2>/dev/null', { stdio: 'ignore' });
            console.log('Web dashboard stopped (by port).');
        }
        catch {
            console.error('No running web dashboard found.');
        }
        try {
            unlinkSync(pidFile);
        }
        catch { /* ignore */ }
        return;
    }
    try {
        process.kill(-pid, 'SIGTERM');
    }
    catch (err) {
        const code = err instanceof Error && 'code' in err
            ? err.code
            : undefined;
        if (code !== 'ESRCH') {
            console.error('Failed to stop web dashboard:', err);
        }
    }
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
function statusWeb() {
    const pid = isRunning();
    if (pid !== null) {
        console.log(`Running (PID ${pid}) → http://localhost:3141`);
        console.log(`Logs: ${logFile}`);
    }
    else {
        console.log('Not running. Start with: finn web');
    }
}
export function register(program) {
    const web = program
        .command('web')
        .description('Start the web dashboard in the background (http://localhost:3141)')
        .action(startWeb);
    web
        .command('stop')
        .description('Stop the running web dashboard')
        .action(stopWeb);
    web
        .command('status')
        .description('Check if the web dashboard is running')
        .action(statusWeb);
}
//# sourceMappingURL=web.js.map