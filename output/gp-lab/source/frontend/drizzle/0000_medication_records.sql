CREATE TABLE `medication_records` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`author_email` text NOT NULL,
	`created_at` text NOT NULL,
	`payload` text NOT NULL
);

--> statement-breakpoint
CREATE INDEX `idx_medication_records_created_at` ON `medication_records` (`created_at`);