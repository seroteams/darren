// The Postgres connection — a lazily-opened pg Pool wrapped by Drizzle, typed
// against ./schema. This is the one place the app talks to the database.
//
// Lazy + guarded on purpose: importing this file never opens a connection, and
// nothing breaks when DATABASE_URL is unset — the app stays file-backed (Phase 3
// wiring picks the file repo in that case). The pool opens on the first getDb()
// call, i.e. only when a Postgres-backed repo actually runs.

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** True when a Postgres connection string is configured. The wiring switch uses
 *  this to choose the Postgres repo over the file repo. */
export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** The Drizzle handle, opening the pool on first use. Throws if DATABASE_URL is
 *  unset — callers gate on hasDatabaseUrl() and fall back to file storage. */
export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — the Postgres repo needs it. The app falls back to file storage when it is unset.",
    );
  }
  if (!db) {
    pool = new Pool({ connectionString: url });
    db = drizzle(pool, { schema });
  }
  return db;
}

/** Close the pool (tests + graceful shutdown). Safe to call when never opened. */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
