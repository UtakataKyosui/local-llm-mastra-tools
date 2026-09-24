import { createServerFn } from '@tanstack/react-start';

export const getFeedStats = createServerFn({ method: 'GET' }).handler(async () => {
  const { feedStats } = await import('../mastra/feeds/search');
  return feedStats();
});

export const runFeedCollection = createServerFn({ method: 'POST' }).handler(async () => {
  const { collectFeeds } = await import('../mastra/feeds/collect');
  return collectFeeds();
});
