import { getThread, updatePriority } from '../../db/threads.js';
import { THREAD_PRIORITIES } from '../../db/schema.js';
export function register(program) {
    program
        .command('priority <id> <priority>')
        .description('Set thread priority (now|next|later|out)')
        .action((id, priority) => {
        if (!THREAD_PRIORITIES.includes(priority)) {
            console.error(`Error: Invalid priority "${priority}". Valid: ${THREAD_PRIORITIES.join(', ')}`);
            process.exitCode = 1;
            process.exit();
        }
        const thread = getThread(id);
        if (!thread) {
            console.error(`Error: Thread not found: ${id}`);
            process.exitCode = 1;
            process.exit();
        }
        updatePriority(id, priority);
        console.log(`✓ Thread ${id} priority set to ${priority}`);
    });
}
//# sourceMappingURL=priority.js.map