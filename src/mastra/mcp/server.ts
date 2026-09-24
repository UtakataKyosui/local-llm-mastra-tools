import { MCPServer } from '@mastra/mcp';
import { localAgent } from '../agents/local-agent';
import { researchAgent } from '../agents/research-agent';
import { feedAgent } from '../agents/feed-agent';
import { appleFmTool } from '../tools/apple-fm-tool';
import { collectFeedsTool, listFeedSourcesTool, searchFeedsTool } from '../tools/feed-tools';
import { ollamaTool } from '../tools/ollama-tool';
import { fetchPageTool, webSearchTool } from '../tools/web-research-tools';

export const localLlmMcpServer = new MCPServer({
  id: 'local-llm',
  name: 'Local LLM MCP Server',
  version: '0.1.0',
  tools: {
    appleFmTool,
    ollamaTool,
    webSearchTool,
    fetchPageTool,
    searchFeedsTool,
    listFeedSourcesTool,
    collectFeedsTool,
  },
  agents: { localAgent, researchAgent, feedAgent },
});
