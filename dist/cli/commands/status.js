import { getThread, updateState, listThreads, overloadWarning } from '../../db/threads.js';
import { printFocusWarning } from '../ui/format.js';
const VALID_STATES = ['active', 'waiting', 'blocked', 'done'];
export function register(program) {
    program
        .command('status <id> <state>')
        .description('Update thread state')
        .action((id, state) => {
        if (!VALID_STATES.includes(state)) {
            console.error(`Error: Invalid state "${state}". Valid states: ${VALID_STATES.join(', ')}`);
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