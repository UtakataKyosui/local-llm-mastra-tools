import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { feedSourceSchema } from '../mastra/feeds/sources';
import { mcpServerSchema } from '../mastra/mcp/servers';

const idInput = z.object({ id: z.string().min(1) });

export const getFeedSources = createServerFn({ method: 'GET' }).handler(async () => {
  const { listFeedSources } = await import('../mastra/feeds/sources');
  return listFeedSources();
});

export const upsertFeedSource = createServerFn({ method: 'POST' })
  .inputValidator(feedSourceSchema)
  .handler(async ({ data }) => {
    const { saveFeedSource } = await import('../mastra/feeds/sources');
    await saveFeedSource(data);
  });

export const removeFeedSource = createServerFn({ method: 'POST' })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { deleteFeedSource } = await import('../mastra/feeds/sources');
    await deleteFeedSource(data.id);
  });

export const getMcpServers = createServerFn({ method: 'GET' }).handler(async () => {
  const { listMcpServers } = await import('../mastra/mcp/servers');
  return listMcpServers();
});

export const upsertMcpServer = createServerFn({ method: 'POST' })
  .inputValidator(mcpServerSchema)
  .handler(async ({ data }) => {
    const { saveMcpServer } = await import('../mastra/mcp/servers');
    await saveMcpServer(data);
  });

export const removeMcpServer = createServerFn({ method: 'POST' })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const { deleteMcpServer } = await import('../mastra/mcp/servers');
    await deleteMcpServer(data.id);
  });

export const checkMcpServer = createServerFn({ method: 'POST' })
  .inputValidator(mcpServerSchema)
  .handler(async ({ data }) => {
    const { testMcpServer } = await import('../mastra/mcp/client');
    return testMcpServer(data);
  });
