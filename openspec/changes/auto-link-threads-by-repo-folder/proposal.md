## Why

The current web UI is overly simplistic and doesn't provide a professional feel or efficient data density. Additionally, users must manually link sessions to threads or rely solely on GitHub URL matching, which fails for local-only projects or projects without a git remote. Auto-linking by folder name provides a reliable fallback for these cases.

## What Changes

- **Web UI Upgrade**: Complete overhaul of the Dashboard, ThreadCard, and SessionCard components to use Material UI v9 with a modern, "Google-inspired" aesthetic. This includes better use of spacing, elevation, and typography.
- **Context-Aware Thread Linking**: The system will now attempt to match a session to a thread using the `folderName` if a `githubUrl` match is not found.
- **Finn Discover Enhancement**: The `finn discover` command will also suggest links based on folder names, not just GitHub URLs.

## Capabilities

### New Capabilities
- `mui-dashboard-polish`: Refactor the web UI to use Material UI v9 components with a modern, high-density layout.
- `thread-auto-linking-by-folder`: Extend thread detection logic to match sessions to threads based on project folder names.

### Modified Capabilities
- `auto-detect-threads`: Extend `getThreadId` and `findThreadIdByGithubUrl` logic to include folder-based lookup as a fallback.

## Impact

- `src/web/components/Dashboard.tsx`, `ThreadCard.tsx`, `SessionCard.tsx`: Major visual refactoring.
- `src/hooks/common.ts`: Logic update to `getThreadId`.
- `src/db/threads.ts`: New query helper `findThreadIdByFolderName`.
- `src/cli/commands/discover.ts`: Update to include folder-based suggestions.
