import { and, count, desc, gte, inArray, max, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { appDb, ensureAppSchema } from '../storage/app-db';
import { feedItems } from '../storage/schema';

export interface SearchFeedOptions {
  keywords: string[];
  sourceIds?: string[];
  sinceDays?: number;
  limit?: number;
}

const publishedOrCollected = sql<string>`COALESCE(${feedItems.publishedAt}, ${feedItems.collectedAt})`;

const containsLiteral = (column: typeof feedItems.title | typeof feedItems.summary, keyword: string) =>
  sql`${column} LIKE ${`%${keyword.replace(/[\\%_]/g, (c) => `\\${c}`)}%`} ESCAPE '\\'`;

// LIKE-based AND search. Chosen over FTS5 because the default tokenizer cannot split Japanese text.
export const searchFeedItems = async ({ keywords, sourceIds, sinceDays, limit = 20 }: SearchFeedOptions) => {
  await ensureAppSchema();
  const conditions: (SQL | undefined)[] = keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .map((keyword) => or(containsLiteral(feedItems.title, keyword), containsLiteral(feedItems.summary, keyword)));
  if (sourceIds?.length) conditions.push(inArray(feedItems.sourceId, sourceIds));
  if (sinceDays) {
    conditions.push(gte(publishedOrCollected, new Date(Date.now() - sinceDays * 86_400_000).toISOString()));
  }

  return appDb
    .select({
      title: feedItems.title,
      url: feedItems.url,
      summary: feedItems.summary,
      source: feedItems.sourceName,
      publishedAt: feedItems.publishedAt,
    })
    .from(feedItems)
    .where(and(...conditions))
    .orderBy(desc(publishedOrCollected))
    .limit(limit);
};

export const feedStats = async () => {
  await ensureAppSchema();
  const rows = await appDb
    .select({
      sourceId: feedItems.sourceId,
      source: feedItems.sourceName,
      items: count(),
      lastCollectedAt: max(feedItems.collectedAt),
    })
    .from(feedItems)
    .groupBy(feedItems.sourceId, feedItems.sourceName)
    .orderBy(feedItems.sourceName);
  return rows.map((row) => ({ ...row, lastCollectedAt: row.lastCollectedAt ?? '' }));
};
