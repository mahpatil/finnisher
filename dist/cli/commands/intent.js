import { getOpenSessions, setSessionIntent } from '../../db/sessions.js';
export function register(program) {
    program
        .command('intent <text>')
        .description('Set intent on the active session for this directory')
        .action((text) => {
        const cwd = process.cwd();
        const open = getOpenSessions();
        const match = open.find(s => s.projectPath === cwd);
        if (!match) {
            console.error('No active session for this directory');
            process.exitCode = 1;
            process.exit();
            return;
        }
        setSessionIntent(match.id, text);
        console.log(`Intent saved: ${text}`);
    });
}
//# sourceMappingURL=intent.js.map