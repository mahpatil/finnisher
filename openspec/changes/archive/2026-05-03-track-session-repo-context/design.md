## Context

Sessions already store `projectPath` (full absolute path). The missing pieces are a human-readable folder name and the GitHub URL, both of which are derivable at session-start time via git commands. Both fields should be nullable — hook failures must never block an agent session.

## Goals / Non-Goals

**Goals:**
- Add `folder_name` and `github_url` columns to `sessions` table via a new Drizzle migration
- Capture both at session start in hook handlers using `git remote get-url origin`
- Normalise GitHub URL to HTTPS (`https://github.com/…`) — strip `.git`, convert SSH remotes
- Surface both in `finn sessions` CLI output and the Sessions dashboard card

**Non-Goals:**
- Support non-GitHub remotes (GitLab, Bitbucket) — nullable, captured as-is if not github.com
- Backfill historical sessions — both columns nullable, old rows stay null
- Validate that the GitHub URL is a real, accessible repository

## Decisions

**Derive `folderName` from `projectPath` at capture time, not query time**
Storing it denormalises slightly, but avoids a `path.basename()` call in every read path (CLI, API, dashboard). Consistent with how `gitBranch` is stored rather than recomputed.

**Normalise SSH → HTTPS at capture**
`git@github.com:user/repo.git` → `https://github.com/user/repo`. Rationale: the dashboard will render it as a clickable link; HTTPS works in a browser, SSH does not.

**`getGithubUrl` lives in `src/hooks/common.ts`**
Alongside the existing git helpers (`gitBranch`, `gitHead`, `gitUnpushedCount`). Keeps all git shell-out logic in one place and reusable across all hook handlers.

**Return `null` on any error, never throw**
`execSync` can fail (no git, no remote, not a repo). Silently return `null` — the session is still valid without a GitHub URL.

## Risks / Trade-offs

- **SSH remote parsing**: The regex `git@github.com:user/repo.git` → `https://github.com/user/repo` covers the common case. Non-standard SSH aliases will store as-is (still useful, just not a clean link).
- **`folder_name` ≠ repo name**: If the local clone uses a different folder name than the repo, `folderName` shows the local name. Acceptable for MVP — the GitHub URL provides the canonical repo identity.

## Migration Plan

1. Add columns to schema and run `npm run db:generate` to produce a new migration SQL file
2. `runMigrations()` is already called at CLI startup and in API route module init — no manual step needed
3. Rollback: columns are nullable; removing them in a future migration is straightforward
