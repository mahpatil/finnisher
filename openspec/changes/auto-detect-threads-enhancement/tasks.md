# Auto-detect Threads Enhancement Tasks

## Phase 1: Core Detection Logic
- [ ] Implement enhanced `getThreadId()` function in `src/hooks/common.ts`
- [ ] Implement `findThreadIdByGithubUrl()` helper function in `src/hooks/common.ts`
- [ ] Add unit tests for both new functions
- [ ] Verify backward compatibility with existing `.finn-thread` file logic

## Phase 2: Hook Integration
- [ ] Update `src/hooks/claude-code.ts` to use enhanced `getThreadId()`
- [ ] Update `src/hooks/codex.ts` to use enhanced `getThreadId()`
- [ ] Update `src/hooks/opencode.ts` to use enhanced `getThreadId()`
- [ ] Test hook integration with various scenarios:
  - Project with existing `.finn-thread` file
  - Project with GitHub URL matching existing thread
  - Project with no existing links (should create new thread)
  - Project without git repository

## Phase 3: CLI Discovery Command
- [ ] Create new `src/cli/commands/discover.ts` file
- [ ] Implement `finn discover` subcommand to list unlinked projects
- [ ] Implement `finn discover --create` to automatically create threads
- [ ] Implement `finn discover --fix` to verify and suggest corrections
- [ ] Add unit tests for discover command functionality
- [ ] Update CLI registration in `src/cli/index.ts`

## Phase 4: Database Helpers
- [ ] Add helper function to find thread by ID (if not already present)
- [ ] Ensure proper error handling for database operations
- [ ] Add logging for detection failures and fallbacks

## Phase 5: Testing & Documentation
- [ ] Create comprehensive test scenarios:
  - Fresh installation with no existing threads
  - Mixed environment with some `.finn-thread` files and some not
  - Projects with various git remote configurations (HTTPS, SSH, none)
  - Edge cases: detached HEAD, uncommitted changes, etc.
- [ ] Update `CLAUDE.md` to document the new automatic detection behavior
- [ ] Update README.md with information about the `finn discover` command
- [ ] Verify install.sh still works correctly with changes

## Phase 6: Verification & Release
- [ ] Run full test suite to ensure no regressions
- [ ] Manual verification of all hook types (Claude, Codex, OpenCode)
- [ ] Test `finn discover` command in various scenarios
- [ ] Verify backward compatibility by checking existing workflows still work
- [ ] Prepare release notes documenting the enhancement

## Estimated Effort
- Phase 1: 2-3 hours
- Phase 2: 2-3 hours  
- Phase 3: 3-4 hours
- Phase 4: 1-2 hours
- Phase 5: 2-3 hours
- Phase 6: 1-2 hours
- **Total**: Approximately 11-17 hours

## Dependencies
- No new external dependencies required
- Uses existing database functions (`listSessions`, `getThreadById` if exists)
- Uses existing GitHub URL normalization functions

## Risk Assessment
- **Low Risk**: Changes are additive and maintain backward compatibility
- **Medium Risk**: Hook integration could break existing workflows if not tested thoroughly
- **Mitigation**: Comprehensive testing with both new and existing workflows

## Success Criteria
- [ ] Automatic thread detection works for projects with matching GitHub URLs
- [ ] Backward compatibility maintained for existing `.finn-thread` files
- [ ] New `finn discover` command functions as specified
- [ ] All agent hooks (Claude, Codex, OpenCode) properly use enhanced detection
- [ ] No regressions in existing functionality
- [ ] Clear documentation of new features and behaviors