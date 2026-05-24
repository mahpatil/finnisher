import * as p from '@clack/prompts';
import { listThreads, createThread } from '../../db/threads.js';
import { listSessions } from '../../db/sessions.js';
import { getGithubUrl, appendHookLog } from '../../hooks/common.js';
import { join } from 'path';
import { homedir } from 'os';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
const WORKSPACE_ROOT = process.env['FINN_WORKSPACE_ROOT'] ?? join(homedir(), 'agent-os', 'code-workspaces');
export function register(program) {
    program
        .command('discover')
        .description('Discover projects and suggest thread linkages')
        .option('--create', 'Automatically create threads for unlinked projects')
        .option('--fix', 'Verify existing links and suggest corrections')
        .action(async (opts) => {
        p.log.message(`Discovering projects in ${WORKSPACE_ROOT}`);
        // Get all threads for quick lookup
        const allThreads = listThreads();
        const threadMap = new Map();
        for (const t of allThreads) {
            threadMap.set(t.id, t);
        }
        // Scan workspace for projects
        const projects = [];
        try {
            const entries = readdirSync(WORKSPACE_ROOT);
            for (const entry of entries) {
                const projectPath = join(WORKSPACE_ROOT, entry);
                try {
                    // Skip non-directories
                    if (!statSync(projectPath).isDirectory())
                        continue;
                    const folderName = entry;
                    const githubUrl = getGithubUrl(projectPath);
                    // Check for existing .finn-thread file
                    let threadId = null;
                    try {
                        const threadIdFile = join(projectPath, '.finn-thread');
                        const content = readFileSync(threadIdFile, 'utf8').trim();
                        if (content)
                            threadId = content;
                    }
                    catch {
                        // No .finn-thread file
                    }
                    // If no threadId from file, try to find by GitHub URL
                    if (!threadId && githubUrl) {
                        const sessions = listSessions({ githubUrl, limit: 1 });
                        if (sessions && sessions.length > 0) {
                            threadId = sessions[0].threadId ?? null;
                        }
                    }
                    const threadTitle = threadId && threadMap.has(threadId)
                        ? threadMap.get(threadId).title
                        : (threadId ?? null);
                    projects.push({ path: projectPath, folderName, githubUrl, threadId, threadTitle });
                }
                catch (err) {
                    // Skip inaccessible projects
                    appendHookLog(`discover: skipping ${entry}: ${String(err)}`);
                }
            }
        }
        catch (err) {
            p.log.error(`Failed to scan workspace: ${String(err)}`);
            return;
        }
        // Separate linked and unlinked projects
        const linked = projects.filter(proj => proj.threadId !== null);
        const unlinked = projects.filter(proj => proj.threadId === null);
        if (opts.fix) {
            p.log.message(`=== Fix Mode: Verifying existing links ===`);
            for (const project of linked) {
                const thread = threadMap.get(project.threadId);
                if (!thread) {
                    p.log.warn(`Project '${project.folderName}' links to non-existent thread ${project.threadId}`);
                }
                else if (project.githubUrl) {
                    const sessions = listSessions({ threadId: project.threadId ?? undefined, limit: 5 });
                    const hasMatchingSession = sessions.some((s) => s.githubUrl === project.githubUrl);
                    if (!hasMatchingSession) {
                        p.log.warn(`Project '${project.folderName}' (${project.githubUrl}) linked to thread '${thread.title}' but no recent session matches this GitHub URL`);
                    }
                }
            }
        }
        if (opts.create) {
            p.log.message(`=== Create Mode: Creating threads for unlinked projects ===`);
            for (const project of unlinked) {
                if (!project.githubUrl) {
                    p.log.message(`Skipping '${project.folderName}' - no GitHub URL detected`);
                    continue;
                }
                const title = await p.text({
                    message: `Enter thread title for ${project.folderName} (default: "${project.folderName} Development"):`,
                    initialValue: `${project.folderName} Development`
                });
                if (p.isCancel(title)) {
                    p.log.message(`Skipped '${project.folderName}'`);
                    continue;
                }
                const thread = createThread({
                    title: title,
                    nextAction: `Set up development workflow for ${project.folderName}`,
                    state: 'open',
                    owner: 'you'
                });
                try {
                    const threadIdFile = join(project.path, '.finn-thread');
                    writeFileSync(threadIdFile, thread.id + '\n', { encoding: 'utf8' });
                    p.log.success(`Created thread '${thread.title}' (${thread.id}) for ${project.folderName} and linked via .finn-thread`);
                }
                catch (err) {
                    p.log.error(`Failed to create .finn-thread file for ${project.folderName}: ${String(err)}`);
                }
            }
            p.log.message(`Run 'finn list' to see all threads`);
        }
        else {
            // Default display mode
            p.log.message(`=== Discovery Results ===`);
            p.log.message(`Total projects found: ${projects.length}`);
            p.log.message(`Linked projects: ${linked.length}`);
            p.log.message(`Unlinked projects: ${unlinked.length}`);
            p.log.message('');
            if (unlinked.length > 0) {
                p.log.message(`Unlinked projects:`);
                for (const project of unlinked) {
                    const githubInfo = project.githubUrl ? ` (${project.githubUrl})` : ' (no GitHub URL)';
                    p.log.message(`  - ${project.folderName}${githubInfo}`);
                }
                p.log.message('');
                p.log.message(`Tip: Run 'finn discover --create' to automatically create threads for these projects`);
            }
            if (linked.length > 0) {
                p.log.message(`Linked projects:`);
                for (const project of linked) {
                    const thread = threadMap.get(project.threadId);
                    p.log.message(`  - ${project.folderName} → ${thread?.title ?? 'unknown thread'} (${project.threadId})`);
                }
            }
        }
    });
}
//# sourceMappingURL=discover.js.map