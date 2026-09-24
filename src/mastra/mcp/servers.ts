import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { appDb, ensureAppSchema } from '../storage/app-db';
import { mcpServers } from '../storage/schema';

export const mcpServerSchema = z.discriminatedUnion('transport', [
  z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'id は英数字・アンダースコア・ハイフンのみ'),
    enabled: z.boolean().default(true),
    transport: z.literal('stdio'),
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    env: z.record(z.string(), z.string()).default({}),
  }),
  z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'id は英数字・アンダースコア・ハイフンのみ'),
    enabled: z.boolean().default(true),
    transport: z.literal('http'),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).default({}),
  }),
]);

export type McpServerConfig = z.infer<typeof mcpServerSchema>;

export const listMcpServers = async (): Promise<McpServerConfig[]> => {
  await ensureAppSchema();
  const rows = await appDb.select().from(mcpServers).orderBy(asc(mcpServers.id));
  return rows.map((row) => mcpServerSchema.parse({ ...(row.config as object), id: row.id, enabled: row.enabled }));
};

export const saveMcpServer = async (server: McpServerConfig) => {
  await ensureAppSchema();
  const { id, enabled, ...config } = server;
  await appDb
    .insert(mcpServers)
    .values({ id, config, enabled })
    .onConflictDoUpdate({ target: mcpServers.id, set: { config, enabled } });
};

export const deleteMcpServer = async (id: string) => {
  await ensureAppSchema();
  await appDb.delete(mcpServers).where(eq(mcpServers.id, id));
};
