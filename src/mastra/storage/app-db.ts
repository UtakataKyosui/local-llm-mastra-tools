import { createClient } from '@libsql/client';

export const appDb = createClient({ url: process.env.APP_DB_URL ?? 'file:./app.db' });

const DEFAULT_FEED_SOURCES = [
  ['google-news-top', 'Google News (トップ)', 'rss', 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja', null, null],
  [
    'google-news-tech',
    'Google News (テクノロジー)',
    'rss',
    'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ja&gl=JP&ceid=JP:ja',
    null,
    null,
  ],
  ['github-trending', 'GitHub Trending', 'github-trending', null, null, 'daily'],
  ['hacker-news', 'Hacker News', 'rss', 'https://hnrss.org/frontpage', null, null],
  ['zenn-trend', 'Zenn トレンド', 'rss', 'https://zenn.dev/feed', null, null],
];

const migrate = async () => {
  await appDb.batch(
    [
      `CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS feed_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT,
        language TEXT,
        since TEXT,
        enabled INTEGER NOT NULL DEFAULT 1
      )`,
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
      `CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        config TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1
      )`,
    ],
    'write',
  );

  // Seed default feed sources only once, so that sources the user deletes are not restored.
  const seeded = await appDb.execute(`SELECT 1 FROM app_meta WHERE key = 'feed_sources_seeded'`);
  if (seeded.rows.length === 0) {
    await appDb.batch(
      [
        ...DEFAULT_FEED_SOURCES.map((args) => ({
          sql: 'INSERT OR IGNORE INTO feed_sources (id, name, type, url, language, since) VALUES (?, ?, ?, ?, ?, ?)',
          args,
        })),
        `INSERT INTO app_meta (key, value) VALUES ('feed_sources_seeded', '1')`,
      ],
      'write',
    );
  }
};

let ready: Promise<void> | undefined;

export const ensureAppSchema = () => (ready ??= migrate());
