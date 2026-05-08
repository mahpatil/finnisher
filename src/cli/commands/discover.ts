import type { Command } from 'commander'
import * as p from '@clack/prompts'
import { listThreads, getThread, createThread } from '../../db/threads.js'
import { listSessions } from '../../db/sessions.js'
import { getGithubUrl, getFolderName, appendHookLog } from '../../hooks/common.js'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import type { Thread, Session } from '../../db/schema.js'

const WORKSPACE_ROOT = join(homedir(), 'agent-os', 'code-workspaces')

interface ProjectInfo {
  path: string
  folderName: string
  githubUrl: string | null
  threadId: string | null
  threadTitle: string | null
}

export function register(program: Command): void {
  program
    .command('discover')
    .description('Discover projects and suggest thread linkages')
    .option('--create', 'Automatically create threads for unlinked projects')
    .option('--fix', 'Verify existing links and suggest corrections')
    .action(async (opts: { create?: boolean; fix?: boolean }) => {
      p.log(`Discovering projects in ${WORKSPACE_ROOT}`)

      // Get all threads for quick lookup
      const allThreads = listThreads()
      const threadMap = new Map<string, Thread>()
      for (const t of allThreads) {
        threadMap.set(t.id, t)
      }

      // Scan workspace for projects
      const projects: ProjectInfo[] = []
      try {
        const entries = execSync(`ls -1 ${WORKSPACE_ROOT}`, { encoding: 'utf8' })
          .trim()
          .split('\n')
          .filter(Boolean)

        for (const entry of entries) {
          const projectPath = join(WORKSPACE_ROOT, entry)
          try {
            // Check if it's a directory
            execSync(`test -d ${projectPath}`, { stdio: 'ignore' })
            
            const folderName = entry
            const githubUrl = getGithubUrl(projectPath)
            
            // Check for existing .finn-thread file
            let threadId: string | null = null
            try {
              const threadIdFile = join(projectPath, '.finn-thread')
              const content = execSync(`cat ${threadIdFile}`, { encoding: 'utf8', stdio: 'ignore' })
                .trim()
              if (content) {
                threadId = content
              }
            } catch {
              // No .finn-thread file
            }

            // If no threadId from file, try to find by GitHub URL
            if (!threadId && githubUrl) {
              const sessions = listSessions({ githubUrl, limit: 1 })
              if (sessions && sessions.length > 0) {
                threadId = sessions[0].threadId
              }
            }

            const threadTitle = threadId && threadMap.has(threadId) 
              ? threadMap.get(threadId)!.title 
              : (threadId ?? null)

            projects.push({
              path: projectPath,
              folderName,
              githubUrl,
              threadId,
              threadTitle
            })
          } catch (err) {
            // Skip non-directories or inaccessible projects
            appendHookLog(`discover: skipping ${entry}: ${String(err)}`)
          }
        }
      } catch (err) {
        p.error(`Failed to scan workspace: ${String(err)}`)
        return
      }

      // Separate linked and unlinked projects
      const linked = projects.filter(p => p.threadId !== null)
      const unlinked = projects.filter(p => p.threadId === null)

      if (opts.fix) {
        p.log(`=== Fix Mode: Verifying existing links ===`)
        for (const project of linked) {
          const thread = threadMap.get(project.threadId!)
          if (!thread) {
            p.warning(`Project '${project.folderName}' links to non-existent thread ${project.threadId}`)
            // Suggest creating a new thread or removing the link
          } else if (project.githubUrl) {
            // Verify the thread's sessions have this GitHub URL
            const sessions = listSessions({ threadId: project.threadId, limit: 5 })
            const hasMatchingSession = sessions.some((s: Session) => s.githubUrl === project.githubUrl)
            if (!hasMatchingSession) {
              p.warning(`Project '${project.folderName}' (${project.githubUrl}) linked to thread '${thread.title}' but no recent session matches this GitHub URL`)
            }
          }
        }
      }

      if (opts.create) {
        p.log(`=== Create Mode: Creating threads for unlinked projects ===`)
        for (const project of unlinked) {
          if (!project.githubUrl) {
            p.log(`Skipping '${project.folderName}' - no GitHub URL detected`)
            continue
          }

          const title = await p.text({
            message: `Enter thread title for ${project.folderName} (default: "${project.folderName} Development"):`,
            initialValue: `${project.folderName} Development`
          })
          if (p.isCancel(title)) {
            p.log(`Skipped '${project.folderName}'`)
            continue
          }

          const thread = createThread({
            title: title as string,
            nextAction: `Set up development workflow for ${project.folderName}`,
            state: 'active',
            owner: 'you'
          })

          // Create .finn-thread file
          try {
            const threadIdFile = join(project.path, '.finn-thread')
            writeFileSync(threadIdFile, thread.id + '\n', { encoding: 'utf8' })
            p.success(`Created thread '${thread.title}' (${thread.id}) for ${project.folderName} and linked via .finn-thread`)
          } catch (err) {
            p.error(`Failed to create .finn-thread file for ${project.folderName}: ${String(err)}`)
          }
        }
        p.log(`Run 'finn list' to see all threads`)
      } else {
        // Default display mode
        p.log(`=== Discovery Results ===`)
        p.log(`Total projects found: ${projects.length}`)
        p.log(`Linked projects: ${linked.length}`)
        p.log(`Unlinked projects: ${unlinked.length}`)
        p.log('')

        if (unlinked.length > 0) {
          p.log(`Unlinked projects:`)
          for (const project of unlinked) {
            const githubInfo = project.githubUrl ? ` (${project.githubUrl})` : ' (no GitHub URL)'
            p.log(`  - ${project.folderName}${githubInfo}`)
          }
          p.log('')
          p.log(`Tip: Run 'finn discover --create' to automatically create threads for these projects`)
        }

        if (linked.length > 0) {
          p.log(`Linked projects:`)
          for (const project of linked) {
            const thread = threadMap.get(project.threadId!)
            p.log(`  - ${project.folderName} → ${thread?.title ?? 'unknown thread'} (${project.threadId})`)
          }
        }
      }
    })
}