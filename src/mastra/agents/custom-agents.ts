import { Agent } from '@mastra/core/agent';
import type { Mastra } from '@mastra/core/mastra';
import { Memory } from '@mastra/memory';
import { asc, eq } from 'drizzle-orm';
import { listExternalMcpToolsets } from '../mcp/client';
import { OLLAMA_BASE_URL, ollamaModel } from '../models/ollama';
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

const fetchModelCapabilities = async (name: string): Promise<string[]> => {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/show`, {
    method: 'POST',
    body: JSON.stringify({ model: name }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { capabilities?: string[] };
  return data.capabilities ?? [];
};

// Capabilities come from Ollama itself, so "tools" reflects whether the model can call tools.
export const listOllamaModels = async () => {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Ollama /api/tags returned ${res.status}`);
  const data = (await res.json()) as { models?: { name: string }[] };
  const names = (data.models ?? []).map((model) => model.name).sort();
  return Promise.all(
    names.map(async (name) => {
      const capabilities = await fetchModelCapabilities(name);
      return { name, capabilities, supportsTools: capabilities.includes('tools') };
    }),
  );
};

export const listMcpToolOptions = async (serverIds: string[]) => {
  if (serverIds.length === 0) return [];
  const toolsets = await listExternalMcpToolsets(serverIds);
  return toolsets.flatMap(({ serverId, tools }) =>
    Object.entries(tools).map(([name, tool]) => ({
      serverId,
      name,
      description: (tool as { description?: string }).description ?? '',
    })),
  );
};

export const listCustomAgents = async (): Promise<CustomAgentConfig[]> => {
  await ensureAppSchema();
  const rows = await appDb.select().from(customAgents).orderBy(asc(customAgents.id));
  return rows.map((row) => customAgentSchema.parse(row));
};

const selectMcpTools = async (config: CustomAgentConfig) => {
  if (config.mcpServerIds.length === 0) return {};
  const selected = new Set(config.mcpToolNames);
  const toolsets = await listExternalMcpToolsets(config.mcpServerIds);
  return Object.fromEntries(
    toolsets.flatMap(({ tools }) => {
      const entries = Object.entries(tools);
      const picked = entries.filter(([name]) => selected.has(name));
      return picked.length > 0 ? picked : entries;
    }),
  );
};

const buildAgent = (config: CustomAgentConfig) =>
  new Agent({
    id: config.id,
    name: config.name,
    description: config.description,
    instructions: config.instructions,
    model:
      config.models.length > 0
        ? config.models.map((modelId) => ({ model: ollamaModel(modelId), maxRetries: 0 }))
        : ollamaModel(),
    tools: async () => ({
      ...Object.fromEntries(config.builtinTools.map((name) => [name, builtinTools[name]])),
      ...(await selectMcpTools(config)),
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
