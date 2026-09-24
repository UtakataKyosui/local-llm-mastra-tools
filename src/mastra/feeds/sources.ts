import { existsSync, readFileSync } from 'node:fs';

export type FeedSource =
  | { id: string; name: string; type: 'rss'; url: string }
  | { id: string; name: string; type: 'github-trending'; language?: string; since?: 'daily' | 'weekly' | 'monthly' };

const DEFAULT_SOURCES: FeedSource[] = [
  {
    id: 'google-news-top',
    name: 'Google News (トップ)',
    type: 'rss',
    url: 'https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja',
  },
  {
    id: 'google-news-tech',
    name: 'Google News (テクノロジー)',
    type: 'rss',
    url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ja&gl=JP&ceid=JP:ja',
  },
  { id: 'github-trending', name: 'GitHub Trending', type: 'github-trending', since: 'daily' },
  { id: 'hacker-news', name: 'Hacker News', type: 'rss', url: 'https://hnrss.org/frontpage' },
  { id: 'zenn-trend', name: 'Zenn トレンド', type: 'rss', url: 'https://zenn.dev/feed' },
];

const configPath = process.env.FEED_SOURCES_CONFIG ?? './feed-sources.json';

export const loadFeedSources = (): FeedSource[] => {
  if (!existsSync(configPath)) return DEFAULT_SOURCES;
  return JSON.parse(readFileSync(configPath, 'utf8')).sources ?? DEFAULT_SOURCES;
};
