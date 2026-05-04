import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export type ThreadState = 'active' | 'waiting' | 'blocked' | 'done'
export type ThreadOwner = 'you' | 'ai_agent' | 'other'
export type AgentType = 'claude_code' | 'codex' | 'opencode' | 'gemini_code' | 'manual'

export const threads = sqliteTable('threads', {
  id:          text('id').primaryKey(),
  title:       text('title').notNull(),
  state:       text('state').$type<ThreadState>().notNull().default('active'),
  nextAction:  text('next_action').notNull(),
  owner:       text('owner').$type<ThreadOwner>().notNull().default('you'),
  notes:       text('notes'),
  createdAt:   integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt:   integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
})

export const sessions = sqliteTable('sessions', {
  id:            text('id').primaryKey(),
  threadId:      text('thread_id').references(() => threads.id),
  agent:         text('agent').$type<AgentType>().notNull(),
  startedAt:     integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  endedAt:       integer('ended_at', { mode: 'timestamp_ms' }),
  tokensIn:      integer('tokens_in'),
  tokensOut:     integer('tokens_out'),
  costUsd:       real('cost_usd'),
  gitBranch:     text('git_branch'),
  lastCommitSha: text('last_commit_sha'),
  lastCommitMsg: text('last_commit_msg'),
  unpushedCount: integer('unpushed_count'),
  openFiles:     text('open_files'),
  projectPath:   text('project_path'),
  folderName:    text('folder_name'),
  githubUrl:     text('github_url'),
})

export type Thread     = typeof threads.$inferSelect
export type NewThread  = typeof threads.$inferInsert
export type Session    = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
