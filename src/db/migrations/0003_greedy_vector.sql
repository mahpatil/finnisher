PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
INSERT INTO `__new_threads`("id", "title", "state", "next_action", "owner", "notes", "priority", "momentum", "stalled", "last_velocity", "created_at", "updated_at", "completed_at", "archived_at") SELECT "id", "title", CASE "state" WHEN 'active' THEN 'open' WHEN 'done' THEN 'closed' ELSE "state" END, "next_action", "owner", "notes", 'later', "momentum", "stalled", "last_velocity", "created_at", "updated_at", "completed_at", NULL FROM `threads`;--> statement-breakpoint
DROP TABLE `threads`;--> statement-breakpoint
ALTER TABLE `__new_threads` RENAME TO `threads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
