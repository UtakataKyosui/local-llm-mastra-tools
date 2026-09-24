CREATE TABLE `feed_items` (
	`url` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`source_name` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`published_at` text,
	`collected_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feed_items_published_at` ON `feed_items` (`published_at`);--> statement-breakpoint
CREATE INDEX `feed_items_source_id` ON `feed_items` (`source_id`);--> statement-breakpoint
CREATE TABLE `feed_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`url` text,
	`language` text,
	`since` text,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mcp_servers` (
	`id` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
