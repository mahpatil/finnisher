## Why

Sessions currently capture `projectPath` (full path) but not the folder name or GitHub remote URL, making it impossible to quickly identify which project a session belongs to or link it back to the repository in the dashboard and CLI views.

## What Changes

- Add `folderName` column to `sessions` table — basename of `projectPath` (e.g. `"finnisher"` from `/Users/mahesh/projects/finnisher`)
- Add `githubUrl` column to `sessions` table — resolved from `git remote get-url origin` at session capture time; normalized to HTTPS (strip `.git` suffix)
- Update hook capture logic to populate both fields when a session starts
- Expose both fields in `finn sessions` CLI output and the Sessions dashboard tab

## Capabilities

### New Capabilities
- `session-repo-context`: Capture and display folder name and GitHub URL alongside each session record

### Modified Capabilities
- `session-schema`: `sessions` table gains two nullable text columns — `folder_name` and `github_url`; existing rows remain valid (both nullable)

## Impact

- **Schema**: new Drizzle migration adding `folder_name` + `github_url` to `sessions`
- **`src/db/sessions.ts`**: `createSession` input type picks up the two new fields automatically via `NewSession`
- **`src/hooks/common.ts`**: `getGithubUrl(cwd)` helper — runs `git remote get-url origin`, normalises HTTPS, returns null on error
- **`src/cli/commands/sessions.ts`**: add columns to table output
- **`src/web/components/SessionCard.tsx`**: show folder name as badge and GitHub URL as link
- **No breaking changes** — both columns nullable, existing sessions unaffected
