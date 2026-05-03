## 1. Schema Migration

- [x] 1.1 Add `folderName` (text, nullable) and `githubUrl` (text, nullable) columns to `sessions` table in `src/db/schema.ts`
- [x] 1.2 Run `npm run db:generate` to produce the new migration SQL file
- [x] 1.3 Verify migration file contains `ALTER TABLE sessions ADD COLUMN folder_name` and `github_url`

## 2. Sessions CRUD

- [x] 2.1 Confirm `NewSession` type picks up both new fields automatically (no manual change needed — Drizzle infers from schema)
- [x] 2.2 Write tests: `createSession` with `folderName` + `githubUrl` persists correctly; nulls accepted
- [x] 2.3 Run `runMigrations()` in test and assert both columns exist on the table

## 3. Hook Helper

- [x] 3.1 Create `src/hooks/common.ts` with `getGithubUrl(cwd: string): string | null`
- [x] 3.2 Implement SSH → HTTPS normalisation: `git@github.com:user/repo.git` → `https://github.com/user/repo`
- [x] 3.3 Strip trailing `.git` from HTTPS remotes
- [x] 3.4 Return `null` (never throw) when git is absent, no remote, or not a repo
- [x] 3.5 Write tests: HTTPS remote, SSH remote, no remote, non-repo directory
- [x] 3.6 Add `getFolderName(projectPath: string | null): string | null` helper — `path.basename(projectPath)` or null

## 4. Hook Integration

- [x] 4.1 Update Claude Code session-start logic to call `getGithubUrl(cwd)` and `getFolderName(cwd)` and pass to `createSession`
- [x] 4.2 Repeat for Codex and OpenCode hook handlers

## 5. CLI Output

- [x] 5.1 Add `Folder` column to `finn sessions` table output (show `folderName` or `"—"`)
- [x] 5.2 Add `Repo` column to `finn sessions` table output (show truncated `githubUrl` or `"—"`)

## 6. Web Dashboard *(deferred — Phase 5)*

- [ ] 6.1 Display `folderName` as a badge on `SessionCard` component
- [ ] 6.2 Render `githubUrl` as a clickable link on `SessionCard` (open in new tab); hide if null
