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
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`next_action` text NOT NULL,
	`owner` text DEFAULT 'you' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer
);
