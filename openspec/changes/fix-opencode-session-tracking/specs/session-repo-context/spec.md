## MODIFIED Requirements

### Requirement: fin setup replaces OpenCode after hook with plugin
The `finn setup` command SHALL detect and remove the existing `after` hook from `~/.opencode/config.json` if it matches the Finnisher command, and install the new plugin-based approach instead.

#### Scenario: After hook removed and plugin installed
- **WHEN** `~/.opencode/config.json` contains `"after": "finn hook opencode-stop"` and `finn setup` is run
- **THEN** the `after` key is removed and `~/.config/opencode/plugins/finnisher.js` is created

#### Scenario: No after hook present
- **WHEN** `~/.opencode/config.json` does not contain an `after` key
- **THEN** setup proceeds to install the plugin without error
