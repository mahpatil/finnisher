-- Recreate sessions without FK so we can drop threads below
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text,
	`agent` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`tokens_in` integer,
	`tokens_out` integer,
	`cost_usd` real,
	`git_branch` text,
	`last_commit_sha` text,
	`last_commit_msg` text,
	`unpushed_count` integer,
	`open_files` text,
	`project_path` text,
	`folder_name` text,
	`github_url` text,
	`agent_id` text,
	`friction_score` integer,
	`effort_type` text
);
--> statement-breakpoint
INSERT INTO `__new_sessions` SELECT `id`, `thread_id`, `agent`, `started_at`, `ended_at`, `tokens_in`, `tokens_out`, `cost_usd`, `git_branch`, `last_commit_sha`, `last_commit_msg`, `unpushed_count`, `open_files`, `project_path`, `folder_name`, `github_url`, `agent_id`, `friction_score`, `effort_type` FROM `sessions`;
--> statement-breakpoint
DROP TABLE `sessions`;
--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;
--> statement-breakpoint
-- Recreate blockers without FK so we can drop threads below
CREATE TABLE `__new_blockers` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'critical' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_blockers` SELECT * FROM `blockers`;
--> statement-breakpoint
DROP TABLE `blockers`;
--> statement-breakpoint
-- Rename threads with state mapping and new columns
CREATE TABLE `__new_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`state` text DEFAULT 'open' NOT NULL,
	`next_action` text NOT NULL,
	`owner` text DEFAULT 'you' NOT NULL,
	`notes` text,
	`priority` text DEFAULT 'later' NOT NULL,
	`momentum` integer DEFAULT 0 NOT NULL,
	`stalled` integer DEFAULT false NOT NULL,
	`last_velocity` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	`archived_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_threads`("id", "title", "state", "next_action", "owner", "notes", "priority", "momentum", "stalled", "last_velocity", "created_at", "updated_at", "completed_at", "archived_at") SELECT "id", "title", CASE "state" WHEN 'active' THEN 'open' WHEN 'done' THEN 'closed' ELSE "state" END, "next_action", "owner", "notes", 'later', "momentum", "stalled", "last_velocity", "created_at", "updated_at", "completed_at", NULL FROM `threads`;
--> statement-breakpoint
DROP TABLE `threads`;
--> statement-breakpoint
ALTER TABLE `__new_threads` RENAME TO `threads`;
--> statement-breakpoint
-- Restore sessions with FK to new threads
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text,
	`agent` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`tokens_in` integer,
	`tokens_out` integer,
	`cost_usd` real,
	`git_branch` text,
	`last_commit_sha` text,
	`last_commit_msg` text,
	`unpushed_count` integer,
	`open_files` text,
	`project_path` text,
	`folder_name` text,
	`github_url` text,
	`agent_id` text,
	`friction_score` integer,
	`effort_type` text,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `sessions` SELECT * FROM `__new_sessions`;
--> statement-breakpoint
DROP TABLE `__new_sessions`;
--> statement-breakpoint
-- Restore blockers with FK to new threads
CREATE TABLE `blockers` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'critical' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `blockers` SELECT * FROM `__new_blockers`;
--> statement-breakpoint
DROP TABLE `__new_blockers`;
