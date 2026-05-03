import * as p from '@clack/prompts';
import { createThread, listThreads, overloadWarning } from '../../db/threads.js';
import { printFocusWarning } from '../ui/format.js';
export function register(program) {
    program
        .command('add')
        .description('Add a new thread')
        .option('--title <title>', 'Thread title')
        .option('--next <action>', 'Next action')
        .action(async (opts) => {
        if (opts.title && opts.next) {
            const thread = createThread({
                title: opts.title,
                nextAction: opts.next,
                state: 'active',
                owner: 'you',
            });
            console.log(`Created thread: ${thread.id}`);
            const all = listThreads();
            const warning = overloadWarning(all);
            if (warning)
                printFocusWarning(warning);
            return;
        }
        p.intro('Add a new thread');
        const title = await p.text({
            message: 'Title',
            validate: (v) => v.trim().length === 0 ? 'Title is required' : undefined,
        });
        if (p.isCancel(title)) {
            console.log('Cancelled.');
            process.exit(0);
        }
        const nextAction = await p.text({
            message: 'Next action',
            validate: (v) => v.trim().length === 0 ? 'Next action is required' : undefined,
        });
        if (p.isCancel(nextAction)) {
            console.log('Cancelled.');
            process.exit(0);
        }
        const owner = await p.select({
            message: 'Owner',
            options: [
                { value: 'you', label: 'You' },
                { value: 'ai_agent', label: 'AI Agent' },
                { value: 'other', label: 'Other' },
            ],
            initialValue: 'you',
        });
        if (p.isCancel(owner)) {
            console.log('Cancelled.');
            process.exit(0);
        }
        const state = await p.select({
            message: 'State',
            options: [
                { value: 'active', label: 'Active' },
                { value: 'waiting', label: 'Waiting' },
                { value: 'blocked', label: 'Blocked' },
            ],
            initialValue: 'active',
        });
        if (p.isCancel(state)) {
            console.log('Cancelled.');
            process.exit(0);
        }
        const thread = createThread({
            title: title,
            nextAction: nextAction,
            owner: owner,
            state: state,
        });
        p.outro(`Created thread: ${thread.id}`);
        const all = listThreads();
        const warning = overloadWarning(all);
        if (warning)
            printFocusWarning(warning);
    });
}
//# sourceMappingURL=add.js.map