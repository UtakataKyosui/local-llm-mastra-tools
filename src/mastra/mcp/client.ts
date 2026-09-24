import { readFileSync, existsSync } from 'node:fs';
import { MCPClient } from '@mastra/mcp';

const configPath = process.env.MCP_SERVERS_CONFIG ?? './mcp-servers.json';

const loadServers = () => {
  if (!existsSync(configPath)) return {};
  return JSON.parse(readFileSync(configPath, 'utf8')).servers ?? {};
};

export const mcpClient = new MCPClient({
  id: 'local-llm-mcp-client',
  servers: loadServers(),
});
