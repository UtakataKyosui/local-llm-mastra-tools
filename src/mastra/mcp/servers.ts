import { z } from 'zod';
import { appDb, ensureAppSchema } from '../storage/app-db';

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
  const { rows } = await appDb.execute('SELECT id, config, enabled FROM mcp_servers ORDER BY id');
  return rows.map((row) =>
    mcpServerSchema.parse({ ...JSON.parse(String(row.config)), id: row.id, enabled: Boolean(row.enabled) }),
  );
};

export const saveMcpServer = async (server: McpServerConfig) => {
  await ensureAppSchema();
  const { id, enabled, ...config } = server;
  await appDb.execute({
    sql: `INSERT INTO mcp_servers (id, config, enabled) VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET config = excluded.config, enabled = excluded.enabled`,
    args: [id, JSON.stringify(config), enabled ? 1 : 0],
  });
};

export const deleteMcpServer = async (id: string) => {
  await ensureAppSchema();
  await appDb.execute({ sql: 'DELETE FROM mcp_servers WHERE id = ?', args: [id] });
};
