import { XMLParser } from 'fast-xml-parser';
import { appDb, ensureAppSchema } from '../storage/app-db';
import { listFeedSources } from './sources';
import type { FeedSource } from './sources';

export interface FeedItem {
  url: string;
  title: string;
  summary: string;
  publishedAt?: string;
}

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toIsoDate = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const text = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'object' && '#text' in value) return String(value['#text']);
  return String(value);
};

const asArray = <T>(value: T | T[] | undefined): T[] => (value == null ? [] : Array.isArray(value) ? value : [value]);

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const parseRss = (xml: string): FeedItem[] => {
  const doc = parser.parse(xml);
  // RSS 2.0
  const rssItems = asArray(doc.rss?.channel?.item ?? doc['rdf:RDF']?.item);
  if (rssItems.length > 0) {
    return rssItems.map((item) => ({
      url: text(item.link),
      title: stripHtml(text(item.title)),
      summary: stripHtml(text(item.description ?? item['content:encoded'])).slice(0, 1000),
      publishedAt: toIsoDate(text(item.pubDate ?? item['dc:date'])),
    }));
  }
  // Atom
  return asArray(doc.feed?.entry).map((entry) => {
    const links = asArray(entry.link);
    const link = links.find((l) => l['@_rel'] === 'alternate' || !l['@_rel']) ?? links[0];
    return {
      url: link?.['@_href'] ?? '',
      title: stripHtml(text(entry.title)),
      summary: stripHtml(text(entry.summary ?? entry.content)).slice(0, 1000),
      publishedAt: toIsoDate(text(entry.published ?? entry.updated)),
    };
  });
};

const parseGitHubTrending = (html: string): FeedItem[] => {
  const now = new Date().toISOString();
  return [...html.matchAll(/<article class="Box-row">([\s\S]*?)<\/article>/g)].flatMap(([, block]) => {
    const repo = block.match(/<h2[\s\S]*?href="\/([^"]+)"/)?.[1];
    if (!repo) return [];
    const description = stripHtml(block.match(/<p class="[^"]*col-9[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? '');
    const language = block.match(/itemprop="programmingLanguage">([^<]+)</)?.[1] ?? '';
    const starsToday = stripHtml(block.match(/([\d,]+ stars? (?:today|this week|this month))/)?.[1] ?? '');
    return [
      {
        url: `https://github.com/${repo}`,
        title: repo,
        summary: [description, language && `Language: ${language}`, starsToday].filter(Boolean).join(' / '),
        publishedAt: now,
      },
    ];
  });
};

const fetchText = async (url: string) => {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
};

const fetchSource = async (source: FeedSource): Promise<FeedItem[]> => {
  if (source.type === 'rss') return parseRss(await fetchText(source.url));
  const params = new URLSearchParams({ since: source.since ?? 'daily' });
  const path = source.language ? `/${encodeURIComponent(source.language)}` : '';
  return parseGitHubTrending(await fetchText(`https://github.com/trending${path}?${params}`));
};

export interface CollectResult {
  sourceId: string;
  fetched: number;
  error?: string;
}

export const collectFeeds = async (sourceIds?: string[]): Promise<CollectResult[]> => {
  await ensureAppSchema();
  const sources = (await listFeedSources()).filter(
    (s) => s.enabled && (!sourceIds?.length || sourceIds.includes(s.id)),
  );
  const collectedAt = new Date().toISOString();

  return Promise.all(
    sources.map(async (source): Promise<CollectResult> => {
      try {
        const items = (await fetchSource(source)).filter((item) => item.url && item.title);
        await appDb.batch(
          items.map((item) => ({
            sql: `INSERT INTO feed_items (url, source_id, source_name, title, summary, published_at, collected_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(url) DO UPDATE SET
                    title = excluded.title,
                    summary = excluded.summary,
                    published_at = COALESCE(excluded.published_at, feed_items.published_at),
                    collected_at = excluded.collected_at`,
            args: [item.url, source.id, source.name, item.title, item.summary, item.publishedAt ?? null, collectedAt],
          })),
          'write',
        );
        return { sourceId: source.id, fetched: items.length };
      } catch (error) {
        return { sourceId: source.id, fetched: 0, error: String(error) };
      }
    }),
  );
};
