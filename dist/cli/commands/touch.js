import { touchThread } from '../../db/threads.js';
export function register(program) {
    program
        .command('touch <id>')
        .description('Touch a thread (hooks only)')
        .action((id) => {
        try {
            touchThread(id);
        }
        catch {
            // Silently ignore errors — touch must never block hooks
        }
    });
}
//# sourceMappingURL=touch.js.map