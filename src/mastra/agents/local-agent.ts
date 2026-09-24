import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { listExternalMcpTools } from '../mcp/client';
import { ollamaModel } from '../models/ollama';
import { appleFmTool } from '../tools/apple-fm-tool';

export const localAgent = new Agent({
  id: 'local-agent',
  name: 'Local Agent',
  description: 'An assistant running on a local Ollama model that can use external MCP tools.',
  instructions: `You are a helpful assistant running entirely on the user's machine.
Use the available tools when they help answer the request.
Use apple-fm-generate when the user explicitly asks for Apple Intelligence.`,
  model: ollamaModel(),
  tools: async ({ requestContext }) => {
    const serverIds = requestContext.get('mcpServerIds') as string[] | undefined;
    return { appleFmTool, ...(await listExternalMcpTools(serverIds)) };
  },
  memory: new Memory(),
});
