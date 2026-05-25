CREATE TABLE IF NOT EXISTS `thread_todos` (
  `id`           text PRIMARY KEY NOT NULL,
  `thread_id`    text NOT NULL REFERENCES `threads`(`id`) ON DELETE CASCADE,
  `text`         text NOT NULL,
  `done`         integer NOT NULL DEFAULT 0,
  `position`     integer NOT NULL DEFAULT 0,
  `created_at`   integer NOT NULL,
  `completed_at` integer
);
