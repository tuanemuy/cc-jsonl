CREATE TABLE `log_file_tracking` (
	`id` text PRIMARY KEY NOT NULL,
	`file_path` text NOT NULL,
	`last_processed_at` integer NOT NULL,
	`file_size` integer,
	`file_modified_at` integer,
	`checksum` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `log_file_tracking_file_path_unique` ON `log_file_tracking` (`file_path`);