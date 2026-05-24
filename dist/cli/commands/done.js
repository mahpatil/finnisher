import { getThread, updateState, listThreads, overloadWarning } from '../../db/threads.js';
import { durationStr, printFocusWarning } from '../ui/format.js';
export function register(program) {
    program
        .command('done <id>')
        .description('Mark a thread as done')
        .action((id) => {
        const thread = getThread(id);
        if (!thread) {
            console.error(`Error: Thread not found: ${id}`);
            process.exitCode = 1;
            process.exit();
        }
        updateState(id, 'closed');
        const elapsed = Date.now() - thread.createdAt.getTime();
        console.log(`✓ Done. Completed in ${durationStr(elapsed)}`);
        const all = listThreads();
        const warning = overloadWarning(all);
        if (warning)
            printFocusWarning(warning);
    });
}
//# sourceMappingURL=done.js.map