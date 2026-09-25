ALTER TABLE `custom_agents` ADD `models` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `custom_agents` ADD `mcp_tool_names` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE `custom_agents` SET `models` = json_array(`model`) WHERE `model` != '';
