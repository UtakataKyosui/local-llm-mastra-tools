import { asc, eq } from 'drizzle-orm';
import { appDb, ensureAppSchema } from '../storage/app-db';
import { feedSources } from '../storage/schema';
import { z } from 'zod';

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

type FeedSourceRow = typeof feedSources.$inferSelect;

const fromRow = (row: FeedSourceRow): FeedSource =>
  row.type === 'rss'
    ? { id: row.id, name: row.name, enabled: row.enabled, type: 'rss', url: row.url ?? '' }
    : {
        id: row.id,
        name: row.name,
        enabled: row.enabled,
        type: 'github-trending',
        language: row.language ?? undefined,
        since: row.since ?? 'daily',
      };

export const listFeedSources = async (): Promise<FeedSource[]> => {
  await ensureAppSchema();
  const rows = await appDb.select().from(feedSources).orderBy(asc(feedSources.name));
  return rows.map(fromRow);
};

export const saveFeedSource = async (source: FeedSource) => {
  await ensureAppSchema();
  const values = {
    id: source.id,
    name: source.name,
    type: source.type,
    url: source.type === 'rss' ? source.url : null,
    language: source.type === 'github-trending' ? (source.language ?? null) : null,
    since: source.type === 'github-trending' ? source.since : null,
    enabled: source.enabled,
  };
  const { id: _id, ...updates } = values;
  await appDb.insert(feedSources).values(values).onConflictDoUpdate({ target: feedSources.id, set: updates });
};

export const deleteFeedSource = async (id: string) => {
  await ensureAppSchema();
  await appDb.delete(feedSources).where(eq(feedSources.id, id));
};
