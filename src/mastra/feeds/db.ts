import { createClient } from '@libsql/client';

export const feedsDb = createClient({ url: process.env.FEEDS_DB_URL ?? 'file:./feeds.db' });

let ready: Promise<unknown> | undefined;

export const ensureFeedsSchema = () =>
  (ready ??= feedsDb.batch(
    [
      `CREATE TABLE IF NOT EXISTS feed_items (
        url TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        source_name TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        published_at TEXT,
        collected_at TEXT NOT NULL
      )`,
      'CREATE INDEX IF NOT EXISTS feed_items_published_at ON feed_items (published_at)',
      'CREATE INDEX IF NOT EXISTS feed_items_source_id ON feed_items (source_id)',
    ],
    'write',
  ));
