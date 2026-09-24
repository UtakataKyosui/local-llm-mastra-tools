import { z } from 'zod';
import { appDb, ensureAppSchema } from '../storage/app-db';

export const feedSourceSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'id は英小文字・数字・ハイフンのみ'),
    name: z.string().min(1),
    enabled: z.boolean().default(true),
    type: z.literal('rss'),
    url: z.string().url(),
  }),
  z.object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'id は英小文字・数字・ハイフンのみ'),
    name: z.string().min(1),
    enabled: z.boolean().default(true),
    type: z.literal('github-trending'),
    language: z.string().optional(),
    since: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  }),
]);

export type FeedSource = z.infer<typeof feedSourceSchema>;

interface FeedSourceRow {
  id: string;
  name: string;
  type: string;
  url: string | null;
  language: string | null;
  since: string | null;
  enabled: number;
}

const fromRow = (row: FeedSourceRow): FeedSource =>
  row.type === 'rss'
    ? { id: row.id, name: row.name, enabled: Boolean(row.enabled), type: 'rss', url: row.url ?? '' }
    : {
        id: row.id,
        name: row.name,
        enabled: Boolean(row.enabled),
        type: 'github-trending',
        language: row.language ?? undefined,
        since: (row.since as 'daily' | 'weekly' | 'monthly' | null) ?? 'daily',
      };

export const listFeedSources = async (): Promise<FeedSource[]> => {
  await ensureAppSchema();
  const { rows } = await appDb.execute('SELECT * FROM feed_sources ORDER BY name');
  return (rows as unknown as FeedSourceRow[]).map(fromRow);
};

export const saveFeedSource = async (source: FeedSource) => {
  await ensureAppSchema();
  await appDb.execute({
    sql: `INSERT INTO feed_sources (id, name, type, url, language, since, enabled)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name, type = excluded.type, url = excluded.url,
            language = excluded.language, since = excluded.since, enabled = excluded.enabled`,
    args: [
      source.id,
      source.name,
      source.type,
      source.type === 'rss' ? source.url : null,
      source.type === 'github-trending' ? (source.language ?? null) : null,
      source.type === 'github-trending' ? source.since : null,
      source.enabled ? 1 : 0,
    ],
  });
};

export const deleteFeedSource = async (id: string) => {
  await ensureAppSchema();
  await appDb.execute({ sql: 'DELETE FROM feed_sources WHERE id = ?', args: [id] });
};
