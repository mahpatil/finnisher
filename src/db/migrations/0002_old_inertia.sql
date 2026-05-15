CREATE TABLE `blockers` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'critical' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD `agent_id` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `friction_score` integer;--> statement-breakpoint
ALTER TABLE `sessions` ADD `effort_type` text;--> statement-breakpoint
ALTER TABLE `threads` ADD `momentum` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `threads` ADD `stalled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `threads` ADD `last_velocity` real;