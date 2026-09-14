import { env } from 'cloudflare:workers';
export function recordsDb(): D1Database {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) throw new Error('Record storage is unavailable.');
  return db;
}
