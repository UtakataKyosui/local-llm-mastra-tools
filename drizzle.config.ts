import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'turso',
  schema: './src/mastra/storage/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.APP_DB_URL ?? 'file:./app.db' },
});
