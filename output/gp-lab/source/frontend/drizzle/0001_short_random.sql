CREATE TABLE `administration_signatures` (
	`home_id` text NOT NULL,
	`client_id` text NOT NULL,
	`medication_id` text NOT NULL,
	`cell_key` text NOT NULL,
	`order_version` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`qty` text NOT NULL,
	`signature` text NOT NULL,
	`actor` text NOT NULL,
	`saved_at` text NOT NULL,
	PRIMARY KEY(`home_id`, `client_id`, `medication_id`, `cell_key`)
);
--> statement-breakpoint
CREATE TABLE `prescription_revisions` (
	`home_id` text NOT NULL,
	`client_id` text NOT NULL,
	`medication_id` text NOT NULL,
	`version` integer NOT NULL,
	`prescription` text NOT NULL,
	`actor` text NOT NULL,
	`saved_at` text NOT NULL,
	PRIMARY KEY(`home_id`, `client_id`, `medication_id`, `version`)
);
