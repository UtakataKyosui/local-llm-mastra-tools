import { createStartRouteHandler } from '@mastra/tanstack-start'
import { createFileRoute } from '@tanstack/react-router'
import { mastra } from '../../mastra'

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: createStartRouteHandler({ mastra }),
  },
})