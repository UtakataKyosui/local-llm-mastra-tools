import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { MastraCompositeStore } from '@mastra/core/storage';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { localAgent } from './agents/local-agent';
import { localLlmMcpServer } from './mcp/server';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, localAgent },
  mcpServers: { localLlm: localLlmMcpServer },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: "mastra-storage",
      // Uses a hosted database when deployed (mastra env db create --kind turso),
      // and a local file during development.
      url: process.env.TURSO_DATABASE_URL ?? "file:./mastra.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }),
});
