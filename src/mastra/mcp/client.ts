import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { MCPClient } from '@mastra/mcp';
import type { MastraMCPServerDefinition } from '@mastra/mcp';
import { listMcpServers } from './servers';
import type { McpServerConfig } from './servers';

// Servers resolve relative paths in env against their own install directory, not the app,
// so "./"-prefixed env values are made absolute against the app's working directory.
const resolveEnv = (env: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(env).map(([key, value]) => [key, value.startsWith('./') ? resolve(process.cwd(), value) : value]),
  );

const toDefinition = (server: McpServerConfig): MastraMCPServerDefinition =>
  server.transport === 'stdio'
    ? { command: server.command, args: server.args, env: resolveEnv(server.env) }
    : { url: new URL(server.url), requestInit: { headers: server.headers } };

let current: { key: string; client: MCPClient } | undefined;

// Rebuilds the client only when the enabled server settings change.
const getClient = async () => {
  const servers = (await listMcpServers()).filter((s) => s.enabled);
  const key = createHash('sha256').update(JSON.stringify(servers)).digest('hex').slice(0, 12);
  if (current?.key === key) return current.client;

  await current?.client.disconnect().catch((error) => console.error(error));
  const client = new MCPClient({
    id: `app-mcp-client-${key}`,
    servers: Object.fromEntries(servers.map((s) => [s.id, toDefinition(s)])),
  });
  current = { key, client };
  return client;
};

export const listExternalMcpTools = async (serverIds?: string[]) => {
  const { toolsets, errors } = await (await getClient()).listToolsetsWithErrors();
  for (const [serverId, error] of Object.entries(errors ?? {})) {
    console.error(`MCP server "${serverId}" failed to connect:`, error);
  }
  return Object.fromEntries(
    Object.entries(toolsets)
      .filter(([serverId]) => !serverIds || serverIds.includes(serverId))
      .flatMap(([serverId, tools]) => Object.entries(tools).map(([name, tool]) => [`${serverId}_${name}`, tool])),
  );
};

export const testMcpServer = async (server: McpServerConfig) => {
  const client = new MCPClient({
    id: `app-mcp-test-${server.id}-${Date.now()}`,
    servers: { [server.id]: toDefinition(server) },
  });
  try {
    const tools = await client.listTools();
    return { ok: true as const, tools: Object.keys(tools) };
  } catch (error) {
    return { ok: false as const, error: String(error) };
  } finally {
    await client.disconnect().catch((error) => console.error(error));
  }
};
