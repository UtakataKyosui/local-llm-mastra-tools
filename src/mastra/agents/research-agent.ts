import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ollamaModel } from '../models/ollama';
import { fetchPageTool, webSearchTool } from '../tools/web-research-tools';

export const researchAgent = new Agent({
  id: 'research-agent',
  name: 'Research Agent',
  description: 'Researches a topic on the web with a local Ollama model and reports findings with sources.',
  instructions: `You are a research assistant running on a local model.
When given a topic or question:
1. Use web-search to find relevant sources. Try more than one query if the first results are weak.
2. Use fetch-page on the 2-4 most promising results to read the actual content.
3. Write a concise report in the user's language: a short summary, key findings as bullet points, and a "Sources" list of the URLs you actually read.
Only state facts supported by the pages you fetched. Say so clearly when information could not be found or sources disagree.`,
  model: ollamaModel(process.env.OLLAMA_RESEARCH_MODEL),
  tools: { webSearchTool, fetchPageTool },
  memory: new Memory(),
  defaultOptions: { maxSteps: 12 },
});
