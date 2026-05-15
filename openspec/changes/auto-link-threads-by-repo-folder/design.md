## Context

The current system supports thread auto-detection primarily via GitHub URL. This is effective but limited to projects with git remotes. The web UI is functional but lacks professional polish and visual hierarchy.

## Goals / Non-Goals

**Goals:**
- Improve web UI density and aesthetics using Material UI v9.
- Provide a robust fallback for thread auto-linking using folder names.
- Ensure the `finn discover` command is more useful for local-only projects.

**Non-Goals:**
- Changing the underlying database schema.
- Implementing complex fuzzy matching for folder names (exact match only for now).

## Decisions

### 1. Web UI Refactoring
- **Choice**: Use a `Grid` or `Box` with flexbox for the main dashboard layout to ensure better use of horizontal space.
- **Rationale**: The current single-column layout doesn't scale well on larger screens.
- **Components**:
  - `ThreadCard`: Use `Card` with `CardHeader` and `CardContent`. Add `Chip` components for status.
  - `SessionCard`: Use a more compact list item style or a very thin card.

### 2. Folder-Based Thread Detection
- **Choice**: Exact match on `folderName`.
- **Rationale**:Basename of the project path is a strong enough indicator for personal workflows.
- **Flow**:
  1. Check `.finn-thread`.
  2. If not found, check `githubUrl` match.
  3. If not found, check `folderName` match.
  4. If multiple threads found for a folder, pick the most recently active one.

### 3. Database Helper
- **Choice**: Add `findThreadIdByFolderName` to `src/db/threads.ts`.
- **Rationale**: Centralize all thread lookup logic. The query will join `sessions` and `threads` and order by `threads.updated_at DESC`.

## Risks / Trade-offs

- **Risk**: Folder name collisions (e.g., two different projects both named "src" or "test").
  - **Mitigation**: This is why it's a fallback. Users can always manually set `.finn-thread` if the auto-link is incorrect.
- **Risk**: Overwhelming the UI with too many MUI components.
  - **Mitigation**: Maintain a clean, minimal design consistent with Google's design system.
