CREATE TABLE `custom_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`instructions` text NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`mcp_server_ids` text NOT NULL,
	`builtin_tools` text NOT NULL,
	`max_steps` integer
);
