import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
export const THREAD_STATES = ['new', 'open', 'waiting', 'blocked', 'closed', 'archived'];
export const THREAD_PRIORITIES = ['now', 'next', 'later', 'out'];
export const threads = sqliteTable('threads', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    state: text('state').$type().notNull().default('open'),
    nextAction: text('next_action').notNull(),
    owner: text('owner').$type().notNull().default('you'),
    notes: text('notes'),
    priority: text('priority').$type().notNull().default('later'),
    momentum: integer('momentum').notNull().default(0),
    stalled: integer('stalled', { mode: 'boolean' }).notNull().default(false),
    lastVelocity: real('last_velocity'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    archivedAt: integer('archived_at', { mode: 'timestamp_ms' }),
});
export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(),
    threadId: text('thread_id').references(() => threads.id),
    agent: text('agent').$type().notNull(),
    agentId: text('agent_id'),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    costUsd: real('cost_usd'),
    frictionScore: integer('friction_score'),
    effortType: text('effort_type'),
    gitBranch: text('git_branch'),
    lastCommitSha: text('last_commit_sha'),
    lastCommitMsg: text('last_commit_msg'),
    unpushedCount: integer('unpushed_count'),
    openFiles: text('open_files'),
    projectPath: text('project_path'),
    folderName: text('folder_name'),
    githubUrl: text('github_url'),
});
export const blockers = sqliteTable('blockers', {
    id: text('id').primaryKey(),
    threadId: text('thread_id').notNull().references(() => threads.id),
    description: text('description').notNull(),
    status: text('status').$type().notNull().default('critical'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});
export const threadTodos = sqliteTable('thread_todos', {
    id: text('id').primaryKey(),
    threadId: text('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
});
//# sourceMappingURL=schema.js.map