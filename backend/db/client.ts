// The Postgres connection — a lazily-opened pg Pool wrapped by Drizzle, typed
// against ./schema. This is the one place the app talks to the database.
//
// Lazy + guarded on purpose: importing this file never opens a connection, and
// nothing breaks when DATABASE_URL is unset — the app stays file-backed (Phase 3
// wiring picks the file repo in that case). The pool opens on the first getDb()
// call, i.e. only when a Postgres-backed repo actually runs.

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { PoolConfig } from "pg";
import * as schema from "./schema.ts";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Pool settings with EVERY wait bounded — a wedged client must surface as an
 *  error, never an infinite hang. (Regression 2026-07-08: pg's defaults — no
 *  connect timeout, no query timeout, no keepalive — let dead clients pile up
 *  until every DB request hung forever and only a restart recovered.) */
export function poolConfig(url: string): PoolConfig {
  return {
    connectionString: url,
    max: 10,
    // Bounds BOTH opening a socket and waiting for a free pooled client — the
    // exact "hang forever with zero bytes" failure mode.
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    // Detect silently-dropped connections (laptop sleep, proxy drop) instead of
    // letting a query on a dead socket wait forever.
    keepAlive: true,
    // The server kills a runaway statement at 60s; the client gives up shortly
    // after, so even a dead socket frees its pool slot.
    statement_timeout: 60_000,
    query_timeout: 65_000,
  };
}

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
    pool = new Pool(poolConfig(url));
    // An idle client erroring (e.g. the server dropping it) must be logged and
    // discarded, not crash or wedge the process.
    pool.on("error", (e) => console.warn("[db] idle client error:", e.message));
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
