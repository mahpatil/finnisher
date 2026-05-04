## 1. Hook Handler — Add OpenCode start handler

- [ ] 1.1 Add `handleOpencodeStart()` to `src/hooks/opencode.ts` — reads `.finn-thread`, captures git context, creates session with `agent: 'opencode'`, prevents duplicates
- [ ] 1.2 Update `handleOpencodeStop()` to accept `cwd` parameter for project path resolution

## 2. Hook Dispatcher — Wire up opencode-start event

- [ ] 2.1 Add `'opencode-start'` to the `EVENTS` const in `src/cli/commands/hook.ts`
- [ ] 2.2 Add switch case for `opencode-start` calling `handleOpencodeStart(cwd)`

## 3. Setup Command — Replace after hook with plugin

- [ ] 3.1 Create `~/.config/opencode/plugins/finnisher.js` — OpenCode plugin that spawns `finn hook opencode-start` on `session.created` and `finn hook opencode-stop` on `session.deleted`
- [ ] 3.2 Update `finn setup` to detect existing `after` hook in `~/.opencode/config.json` and remove it if it matches the Finnisher command
- [ ] 3.3 Update `finn setup` to create the plugin file instead of registering the `after` hook
- [ ] 3.4 Ensure plugin file is idempotent — re-running setup doesn't duplicate or break the plugin

## 4. Tests

- [ ] 4.1 Write unit tests for `handleOpencodeStart()` — session creation, thread linking, duplicate prevention
- [ ] 4.2 Write unit tests for updated `handleOpencodeStop()` with cwd parameter
- [ ] 4.3 Write unit tests for setup removing existing `after` hook
- [ ] 4.4 Write unit tests for plugin file creation (content verification)
