import { createStartRouteHandler } from '@mastra/tanstack-start'
import type { StartRouteHandler } from '@mastra/tanstack-start'
import { createFileRoute } from '@tanstack/react-router'
import { mastra } from '../../mastra'
import { ensureCustomAgents } from '../../mastra/agents/custom-agents'

const handlers = createStartRouteHandler({ mastra })

// Custom agents live in the app DB, so they are registered before the Mastra API resolves any agent.
const withCustomAgents =
  (handler: StartRouteHandler): StartRouteHandler =>
  async (ctx) => {
    await ensureCustomAgents()
    return handler(ctx)
  }

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: withCustomAgents(handlers.GET),
      POST: withCustomAgents(handlers.POST),
      PUT: withCustomAgents(handlers.PUT),
      DELETE: withCustomAgents(handlers.DELETE),
      PATCH: withCustomAgents(handlers.PATCH),
      OPTIONS: withCustomAgents(handlers.OPTIONS),
      HEAD: withCustomAgents(handlers.HEAD),
    },
  },
})
