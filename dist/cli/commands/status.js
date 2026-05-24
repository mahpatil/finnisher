import { getThread, updateState, listThreads, overloadWarning } from '../../db/threads.js';
import { THREAD_STATES } from '../../db/schema.js';
import { printFocusWarning } from '../ui/format.js';
export function register(program) {
    program
        .command('status <id> <state>')
        .description('Update thread state')
        .action((id, state) => {
        if (!THREAD_STATES.includes(state)) {
            console.error(`Error: Invalid state "${state}". Valid states: ${THREAD_STATES.join(', ')}`);
            process.exitCode = 1;
            process.exit();
        }
        const thread = getThread(id);
        if (!thread) {
            console.error(`Error: Thread not found: ${id}`);
            process.exitCode = 1;
            process.exit();
        }
        updateState(id, state);
        console.log(`✓ Thread ${id} state set to ${state}`);
        const all = listThreads();
        const warning = overloadWarning(all);
        if (warning)
            printFocusWarning(warning);
    });
}
//# sourceMappingURL=status.js.map