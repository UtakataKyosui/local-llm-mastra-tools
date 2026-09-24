import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const feedSources = sqliteTable('feed_sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['rss', 'github-trending'] }).notNull(),
  url: text('url'),
  language: text('language'),
  since: text('since', { enum: ['daily', 'weekly', 'monthly'] }),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
});

export const feedItems = sqliteTable(
  'feed_items',
  {
    url: text('url').primaryKey(),
    sourceId: text('source_id').notNull(),
    sourceName: text('source_name').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    publishedAt: text('published_at'),
    collectedAt: text('collected_at').notNull(),
  },
  (table) => [
    index('feed_items_published_at').on(table.publishedAt),
    index('feed_items_source_id').on(table.sourceId),
  ],
);

export const mcpServers = sqliteTable('mcp_servers', {
  id: text('id').primaryKey(),
  config: text('config', { mode: 'json' }).notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
});
