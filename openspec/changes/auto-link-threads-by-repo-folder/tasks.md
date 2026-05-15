## 1. Database & Core Logic

- [ ] 1.1 Implement `findThreadIdByFolderName` in `src/db/threads.ts`
- [ ] 1.2 Update `getThreadId` in `src/hooks/common.ts` to include folder-based lookup fallback
- [ ] 1.3 Verify folder-based linking with unit tests in `test/hooks.test.ts` (or similar)

## 2. CLI Enhancements

- [ ] 2.1 Update `finn discover` command to scan and suggest links based on folder name matches
- [ ] 2.2 Add tests for `discover` command folder matching logic

## 3. Web UI: Layout & Theme

- [ ] 3.1 Refactor `src/web/components/Dashboard.tsx` to use a more professional `Container` and `Box` layout
- [ ] 3.2 Improve the Dashboard header with better typography and aligned actions
- [ ] 3.3 Update `Tabs` styling to be more modern and indicate counts clearly

## 4. Web UI: Component Polish

- [ ] 4.1 Refactor `src/web/components/ThreadCard.tsx` to use MUI `Card`, `Chip`, and better vertical rhythm
- [ ] 4.2 Add status color indicators (Active: primary, Waiting: warning, Stalled: error) to `ThreadCard`
- [ ] 4.3 Refactor `src/web/components/SessionCard.tsx` to show `folderName` and `githubUrl` context elegantly
- [ ] 4.4 Ensure the UI is responsive and looks good on both desktop and tablet widths
