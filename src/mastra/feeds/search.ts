import { appDb, ensureAppSchema } from '../storage/app-db';

export interface SearchFeedOptions {
  keywords: string[];
  sourceIds?: string[];
  sinceDays?: number;
  limit?: number;
}

export interface FeedSearchHit {
  title: string;
  url: string;
  summary: string;
  source: string;
  publishedAt: string | null;
}

// LIKE-based AND search. Chosen over FTS5 because the default tokenizer cannot split Japanese text.
export const searchFeedItems = async ({ keywords, sourceIds, sinceDays, limit = 20 }: SearchFeedOptions) => {
  await ensureAppSchema();
  const where: string[] = [];
  const args: (string | number)[] = [];

  for (const keyword of keywords.map((k) => k.trim()).filter(Boolean)) {
    where.push(`(title LIKE ? ESCAPE '\\' OR summary LIKE ? ESCAPE '\\')`);
    const pattern = `%${keyword.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    args.push(pattern, pattern);
  }
  if (sourceIds?.length) {
    where.push(`source_id IN (${sourceIds.map(() => '?').join(', ')})`);
    args.push(...sourceIds);
  }
  if (sinceDays) {
    where.push('COALESCE(published_at, collected_at) >= ?');
    args.push(new Date(Date.now() - sinceDays * 86_400_000).toISOString());
  }

  const { rows } = await appDb.execute({
    sql: `SELECT title, url, summary, source_name AS source, published_at AS publishedAt
          FROM feed_items
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY COALESCE(published_at, collected_at) DESC
          LIMIT ?`,
    args: [...args, limit],
  });
  return rows as unknown as FeedSearchHit[];
};

export const feedStats = async () => {
  await ensureAppSchema();
  const { rows } = await appDb.execute(
    `SELECT source_id AS sourceId, source_name AS source, COUNT(*) AS items, MAX(collected_at) AS lastCollectedAt
     FROM feed_items GROUP BY source_id, source_name ORDER BY source_name`,
  );
  return rows as unknown as { sourceId: string; source: string; items: number; lastCollectedAt: string }[];
};
