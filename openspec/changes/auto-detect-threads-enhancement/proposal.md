# Auto-detect Threads Enhancement Proposal

## Summary
This proposal describes an enhancement to the Finnisher system that enables automatic detection and linking of threads to projects based on GitHub URLs and workspace scanning. This eliminates the need for manual `.finn-thread` file creation while maintaining backward compatibility with existing workflows.

## Motivation
Currently, users must manually create `.finn-thread` files in each project root to link that project to a Finnisher thread. This creates friction in the workflow, especially when:
1. Starting work on a new project
2. Switching between multiple projects
3. Onboarding new team members to the system
4. Recovering from accidental deletion of `.finn-thread` files

By automatically detecting threads through GitHub URL matching and workspace scanning, we can significantly reduce setup overhead while preserving the existing manual linking method for those who prefer it.

## Detailed Design

### Enhanced Thread Detection Logic
The core enhancement modifies the `getThreadId()` function in `src/hooks/common.ts` to implement a fallback chain:

1. **First Priority**: Check for existing `.finn-thread` file (maintains backward compatibility)
2. **Second Priority**: Query database for threads with sessions matching the project's GitHub URL
3. **Fallback**: Return null (letting the calling code decide whether to create a new thread)

### Implementation Details

#### Modified `getThreadId()` Function
```typescript
export function getThreadId(cwd: string = process.cwd()): string | null {
  // 1. First check for .finn-thread file (backward compatibility)
  try {
    const fileContent = readFileSync(join(cwd, '.finn-thread'), 'utf8')
    const threadIdFromFile = fileContent.trim()
    if (threadIdFromFile) {
      // Verify thread exists in DB
      const thread = getThreadById(threadIdFromFile)
      if (thread) return threadIdFromFile
    }
  } catch {
    // File doesn't exist or other error - continue to GitHub check
  }

  // 2. Check for GitHub URL match
  const githubUrl = getGithubUrl(cwd)
  if (githubUrl) {
    const matchingThreadId = findThreadIdByGithubUrl(githubUrl)
    if (matchingThreadId) return matchingThreadId
  }

  // 3. No thread found
  return null
}
```

#### New Helper Function
```typescript
export function findThreadIdByGithubUrl(githubUrl: string): string | null {
  try {
    const sessions = listSessions({ githubUrl, limit: 1 })
    if (sessions.length > 0) {
      return sessions[0].threadId
    }
  } catch (err) {
    appendHookLog(`findThreadIdByGithubUrl error: ${String(err)}`)
  }
  return null
}
```

#### Hook Integration
All agent hooks (Claude Code, Codex, OpenCode) will use the enhanced `getThreadId()` function:
- When starting a session: if thread ID found, use it; if null, create new thread
- When stopping a session: use the determined thread ID for session tracking

#### CLI Discovery Command
Add a new `finn discover` command with subcommands:
- `finn discover`: List projects without thread links
- `finn discover --create`: Automatically create threads for unlinked projects
- `finn discover --fix`: Verify existing links and suggest corrections

### Backward Compatibility
- Existing `.finn-thread` files continue to work unchanged
- No database schema modifications required
- All existing functionality preserved
- Users can still manually create `.finn-thread` files to override automatic detection

## Drawbacks
- Slightly increased complexity in hook initialization
- Dependency on GitHub being accessible for URL normalization
- Potential for incorrect matches if multiple projects share the same GitHub URL (unlikely in practice)
- Minimal performance impact from additional database query during hook startup

## Alternatives Considered
1. **Manual only approach**: Keep current system - rejected due to poor user experience
2. **Database-only approach**: Remove `.finn-thread` files entirely - rejected due to loss of explicit user control
3. **Workspace scanning daemon**: Background process to maintain links - rejected due to complexity and resource usage
4. **GitHub webhook approach**: Use webhooks to detect project changes - rejected due to infrastructure requirements and privacy concerns

## Implementation Plan
1. **Phase 1**: Implement enhanced `getThreadId()` and helper functions
2. **Phase 2**: Update all agent hooks to use the enhanced detection
3. **Phase 3**: Add `finn discover` CLI command
4. **Phase 4**: Test backward compatibility and edge cases
5. **Phase 5**: Document changes in README and CLAUDE.md

## Testing Strategy
- Unit tests for `getThreadId()` and `findThreadIdByGithubUrl()` functions
- Integration tests for hook scenarios (start/stop sessions)
- Manual testing with various project configurations
- Backward compatibility verification with existing `.finn-thread` files
- Edge case testing (no git repo, network issues, etc.)

## Success Metrics
- Reduction in manual `.finn-thread` file creation for new projects
- Successful automatic linking of existing projects to threads
- No reported issues with existing workflows relying on manual `.finn-thread` files
- Positive user feedback on reduced setup friction

## Open Questions
1. Should we create threads automatically when no match is found, or require explicit user action?
2. How should we handle projects with multiple potential thread matches?
3. Should the discover command have interactive mode for batch thread creation?
4. What should be the default thread title when auto-creating threads?

## Conclusion
This enhancement significantly improves the user experience of Finnisher by reducing the manual overhead required to link projects to threads, while maintaining full backward compatibility and preserving user control over the linking process.