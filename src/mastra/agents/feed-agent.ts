import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ollamaModel } from '../models/ollama';
import { collectFeedsTool, listFeedSourcesTool, searchFeedsTool } from '../tools/feed-tools';

export const feedAgent = new Agent({
  id: 'feed-agent',
  name: 'Feed Search Agent',
  description: 'Searches locally collected news, RSS and GitHub Trending items with a local Ollama model.',
  instructions: `You answer questions using news and trend items collected from RSS feeds, Google News and GitHub Trending.
- Always use search-feeds before answering. Split the user's request into 1-3 short keywords.
- If there are no hits, retry with fewer keywords, synonyms, or the other language (Japanese <-> English).
- If list-feed-sources shows no items or data older than a day, call collect-feeds first.
- Answer in the user's language. For each item you mention, include its title, source, date and URL.
- Only report items returned by the tools. Do not invent news.`,
  model: ollamaModel(process.env.OLLAMA_RESEARCH_MODEL),
  tools: { searchFeedsTool, listFeedSourcesTool, collectFeedsTool },
  memory: new Memory(),
  defaultOptions: { maxSteps: 10 },
});
