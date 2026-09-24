import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';

const decodeEntities = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, '')).trim();

const htmlToText = (html: string) =>
  stripTags(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n'),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n');

// DuckDuckGo wraps result links in a redirect (//duckduckgo.com/l/?uddg=<encoded url>).
const unwrapDuckDuckGoUrl = (href: string) => {
  const url = new URL(href, 'https://duckduckgo.com');
  return url.searchParams.get('uddg') ?? url.toString();
};

export const webSearchTool = createTool({
  id: 'web-search',
  description: 'Search the web with DuckDuckGo and return result titles, URLs and snippets.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    maxResults: z.number().int().min(1).max(10).default(5),
  }),
  outputSchema: z.object({
    results: z.array(z.object({ title: z.string(), url: z.string(), snippet: z.string() })),
  }),
  execute: async ({ query, maxResults }) => {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const html = await res.text();

    const links = [...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    const snippets = [...html.matchAll(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)];

    const results = links.slice(0, maxResults).map((match, i) => ({
      title: stripTags(match[2]),
      url: unwrapDuckDuckGoUrl(decodeEntities(match[1])),
      snippet: stripTags(snippets[i]?.[1] ?? ''),
    }));
    return { results };
  },
});

export const fetchPageTool = createTool({
  id: 'fetch-page',
  description: 'Fetch a web page and return its readable text content (truncated).',
  inputSchema: z.object({
    url: z.string().url().describe('URL to fetch'),
    maxChars: z.number().int().min(500).max(20000).default(6000),
  }),
  outputSchema: z.object({
    url: z.string(),
    title: z.string(),
    content: z.string(),
  }),
  execute: async ({ url, maxChars }) => {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
    const html = await res.text();
    const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
    return { url: res.url, title, content: htmlToText(body).slice(0, maxChars) };
  },
});
