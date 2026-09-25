import { Agent } from '@mastra/core/agent';
import type { Mastra } from '@mastra/core/mastra';
import { Memory } from '@mastra/memory';
import { asc, eq } from 'drizzle-orm';
import { listExternalMcpTools } from '../mcp/client';
import { ollamaModel } from '../models/ollama';
import { appDb, ensureAppSchema } from '../storage/app-db';
import { customAgents } from '../storage/schema';
import { appleFmTool } from '../tools/apple-fm-tool';
import { collectFeedsTool, listFeedSourcesTool, searchFeedsTool } from '../tools/feed-tools';
import { ollamaTool } from '../tools/ollama-tool';
import { fetchPageTool, webSearchTool } from '../tools/web-research-tools';
import { customAgentSchema } from './custom-agent-schema';
import type { BuiltinToolName, CustomAgentConfig } from './custom-agent-schema';

const builtinTools = {
  webSearchTool,
  fetchPageTool,
  searchFeedsTool,
  listFeedSourcesTool,
  collectFeedsTool,
  appleFmTool,
  ollamaTool,
} satisfies Record<BuiltinToolName, unknown>;

export const listCustomAgents = async (): Promise<CustomAgentConfig[]> => {
  await ensureAppSchema();
  const rows = await appDb.select().from(customAgents).orderBy(asc(customAgents.id));
  return rows.map((row) => customAgentSchema.parse(row));
};

const buildAgent = (config: CustomAgentConfig) =>
  new Agent({
    id: config.id,
    name: config.name,
    description: config.description,
    instructions: config.instructions,
    model: ollamaModel(config.model || undefined),
    tools: async () => ({
      ...Object.fromEntries(config.builtinTools.map((name) => [name, builtinTools[name]])),
      ...(config.mcpServerIds.length > 0 ? await listExternalMcpTools(config.mcpServerIds) : {}),
    }),
    memory: new Memory(),
    ...(config.maxSteps !== null && { defaultOptions: { maxSteps: config.maxSteps } }),
  });

const registeredIds = new Set<string>();
let synced: Promise<void> | undefined;

const register = async (mastra: Mastra) => {
  const configs = await listCustomAgents();
  for (const id of registeredIds) mastra.removeAgent(id);
  registeredIds.clear();
  for (const config of configs) {
    mastra.addAgent(buildAgent(config), config.id);
    registeredIds.add(config.id);
  }
};

const getMastra = async () => (await import('../index')).mastra as unknown as Mastra;

// Registers the stored agents once per process; the Mastra API reads agents from the instance on each request.
export const ensureCustomAgents = async () => {
  const mastra = await getMastra();
  synced ??= register(mastra).catch((error) => {
    synced = undefined;
    throw error;
  });
  return synced;
};

const reloadCustomAgents = async () => {
  synced = undefined;
  await ensureCustomAgents();
};

export const saveCustomAgent = async (config: CustomAgentConfig) => {
  await ensureCustomAgents();
  const mastra = await getMastra();
  const takenByBuiltin =
    !registeredIds.has(config.id) && Object.values(mastra.listAgents()).some((agent) => agent.id === config.id);
  if (takenByBuiltin) throw new Error(`id "${config.id}" は組み込みの Agent と重複しています`);

  await ensureAppSchema();
  const { id, ...values } = config;
  await appDb.insert(customAgents).values(config).onConflictDoUpdate({ target: customAgents.id, set: values });
  await reloadCustomAgents();
};

export const deleteCustomAgent = async (id: string) => {
  await ensureAppSchema();
  await appDb.delete(customAgents).where(eq(customAgents.id, id));
  await reloadCustomAgents();
};
