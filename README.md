# Local LLM Mastra Tools

Mastra agents and MCP tools that run on local LLMs: [Ollama](https://ollama.com/) and the on-device Apple Foundation Model (`fm` CLI on macOS).

## Features

- **Chat UI** (`/`): talk to the agents below
  - **Feed Search Agent**: searches collected RSS / Google News / GitHub Trending items
  - **Research Agent**: searches the web (DuckDuckGo) and reads pages
  - **Local Agent**: general assistant that can use external MCP servers selected per chat
- **Settings** (`/settings`): manage feed sources and external MCP servers
- **MCP server** (stdio): exposes the tools and agents to MCP clients such as Claude Code (`.mcp.json`)

## Requirements

- Node.js and pnpm
- Ollama with a tool-capable model (default: `gemma4:e4b`)
- macOS with Apple Intelligence for the Apple Foundation Model tool (`/usr/bin/fm`)

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The app database (`app.db`) is created and migrated automatically on first use.

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the web app |
| `pnpm build` / `pnpm start` | Build and run the production server (run from the project root) |
| `pnpm mcp:stdio` | Start the MCP server over stdio |
| `pnpm feeds:collect [sourceId...]` | Collect feed items |
| `pnpm db:generate` | Generate a migration after editing `src/mastra/storage/schema.ts` |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm typecheck` | Type-check the project |
