-- Recommended MCP servers, registered disabled so that each one is opted into from the settings page.
-- Relative paths resolve against the app's working directory (the project root).
INSERT OR IGNORE INTO `mcp_servers` (`id`, `config`, `enabled`) VALUES
  ('filesystem', '{"transport":"stdio","command":"pnpm","args":["dlx","@modelcontextprotocol/server-filesystem","."],"env":{}}', 0),
  ('git', '{"transport":"stdio","command":"uvx","args":["mcp-server-git","--repository","."],"env":{}}', 0),
  ('memory', '{"transport":"stdio","command":"pnpm","args":["dlx","@modelcontextprotocol/server-memory"],"env":{"MEMORY_FILE_PATH":"./mcp-memory.jsonl"}}', 0),
  ('sequential-thinking', '{"transport":"stdio","command":"pnpm","args":["dlx","@modelcontextprotocol/server-sequential-thinking"],"env":{}}', 0),
  ('time', '{"transport":"stdio","command":"uvx","args":["mcp-server-time","--local-timezone=Asia/Tokyo"],"env":{}}', 0),
  ('context7', '{"transport":"http","url":"https://mcp.context7.com/mcp","headers":{}}', 0);
