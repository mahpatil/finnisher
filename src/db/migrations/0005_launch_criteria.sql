CREATE TABLE IF NOT EXISTS `launch_criteria` (
  `id`          text PRIMARY KEY NOT NULL,
  `thread_id`   text NOT NULL REFERENCES `threads`(`id`) ON DELETE CASCADE,
  `text`        text NOT NULL,
  `checked`     integer NOT NULL DEFAULT 0,
  `position`    integer NOT NULL DEFAULT 0,
  `created_at`  integer NOT NULL,
  `checked_at`  integer
);
