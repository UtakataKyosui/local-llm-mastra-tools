import { MCPServer } from '@mastra/mcp';
import { localAgent } from '../agents/local-agent';
import { appleFmTool } from '../tools/apple-fm-tool';
import { ollamaTool } from '../tools/ollama-tool';

export const localLlmMcpServer = new MCPServer({
  id: 'local-llm',
  name: 'Local LLM MCP Server',
  version: '0.1.0',
  tools: { appleFmTool, ollamaTool },
  agents: { localAgent },
});
