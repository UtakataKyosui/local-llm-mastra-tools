import { resolve } from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';

const client = createClient({ url: process.env.APP_DB_URL ?? 'file:./app.db' });

export const appDb = drizzle(client, { schema });

let ready: Promise<void> | undefined;

// Resolved from the working directory because the server bundle does not live next to the source tree.
export const ensureAppSchema = () =>
  (ready ??= migrate(appDb, { migrationsFolder: resolve(process.cwd(), 'drizzle') }).catch((error) => {
    // Allow the next call to retry instead of caching the failure for the lifetime of the process.
    ready = undefined;
    throw error;
  }));
