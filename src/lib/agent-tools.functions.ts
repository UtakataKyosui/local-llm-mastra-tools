import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const agentToolsInput = z.object({
  agentId: z.string().min(1),
  mcpServerIds: z.array(z.string()).optional(),
});

// Returns the tool names exactly as the model sees them (the keys of the agent's tools object).
export const getAgentTools = createServerFn({ method: 'POST' })
  .inputValidator(agentToolsInput)
  .handler(async ({ data }) => {
    const [{ mastra }, { RequestContext }] = await Promise.all([
      import('../mastra'),
      import('@mastra/core/request-context'),
    ]);
    const requestContext = new RequestContext();
    if (data.mcpServerIds) requestContext.set('mcpServerIds', data.mcpServerIds);
    const agent = Object.values(mastra.listAgents()).find((a) => a.id === data.agentId);
    if (!agent) throw new Error(`Unknown agent: ${data.agentId}`);
    const tools = await agent.listTools({ requestContext });
    return Object.entries(tools).map(([name, tool]) => ({
      name,
      description: (tool as { description?: string }).description ?? '',
    }));
  });
