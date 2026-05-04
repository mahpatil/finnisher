## MODIFIED Requirements

### Requirement: AgentType union includes gemini_code
The `AgentType` type in `src/db/schema.ts` SHALL include `'gemini_code'` as a valid agent type alongside `'claude_code'`, `'codex'`, `'opencode'`, and `'manual'`.

#### Scenario: gemini_code is a valid AgentType
- **WHEN** `createSession({ agent: 'gemini_code', ... })` is called
- **THEN** the session is persisted without type errors and `agent` is stored as `'gemini_code'`

#### Scenario: AgentType type check accepts gemini_code
- **WHEN** TypeScript compilation is run
- **THEN** `'gemini_code'` is accepted as a valid value for `AgentType` without type errors
