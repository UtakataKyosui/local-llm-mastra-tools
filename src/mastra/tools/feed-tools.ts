import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { collectFeeds } from '../feeds/collect';
import { feedStats, searchFeedItems } from '../feeds/search';
import { listFeedSources } from '../feeds/sources';

export const searchFeedsTool = createTool({
  id: 'search-feeds',
  description:
    'Search collected RSS / Google News / GitHub Trending items stored locally. All keywords must match (AND). Use short keywords; try Japanese and English variants separately.',
  inputSchema: z.object({
    keywords: z.array(z.string()).describe('Keywords that must all appear in the title or summary. Empty returns the latest items.'),
    sourceIds: z.array(z.string()).optional().describe('Restrict to these source ids (see list-feed-sources)'),
    sinceDays: z.number().int().min(1).optional().describe('Only items published within this many days'),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  outputSchema: z.object({
    items: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        summary: z.string(),
        source: z.string(),
        publishedAt: z.string().nullable(),
      }),
    ),
  }),
  execute: async (input) => ({ items: await searchFeedItems(input) }),
});

export const listFeedSourcesTool = createTool({
  id: 'list-feed-sources',
  description: 'List configured feed sources with how many items are stored and when they were last collected.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    sources: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        items: z.number(),
        lastCollectedAt: z.string().nullable(),
      }),
    ),
  }),
  execute: async () => {
    const stats = new Map((await feedStats()).map((s) => [s.sourceId, s]));
    return {
      sources: (await listFeedSources()).map((s) => ({
        id: s.id,
        name: s.name,
        items: Number(stats.get(s.id)?.items ?? 0),
        lastCollectedAt: stats.get(s.id)?.lastCollectedAt ?? null,
      })),
    };
  },
});

export const collectFeedsTool = createTool({
  id: 'collect-feeds',
  description: 'Fetch the latest items from feed sources and store them locally. Call when stored data is missing or stale.',
  inputSchema: z.object({
    sourceIds: z.array(z.string()).optional().describe('Source ids to collect. Omit to collect all sources.'),
  }),
  outputSchema: z.object({
    results: z.array(z.object({ sourceId: z.string(), fetched: z.number(), error: z.string().optional() })),
  }),
  execute: async ({ sourceIds }) => ({ results: await collectFeeds(sourceIds) }),
});
