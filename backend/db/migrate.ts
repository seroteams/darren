// Boot-time migrations (postgres-runtime-data Phase 1). The API server applies
// pending migrations itself on startup, so a deploy is never running against a
// schema it wasn't built for — `npm run db:migrate` stays for manual/CI use.
// The CLI deliberately does NOT call this (it fails loudly via the env-guard's
// "run npm run db:migrate" hint instead): auto-migrating from a short-lived
// side process is how two processes race the same migration.

import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { ROOT } from "../engine/paths.mts";
import { getDb, hasDatabaseUrl } from "./client.ts";

const MIGRATIONS_FOLDER = path.join(ROOT, "backend", "db", "migrations");

/** Apply pending migrations. No-op in file mode (no DATABASE_URL). */
export async function runMigrations(): Promise<void> {
  if (!hasDatabaseUrl()) return;
  const t0 = Date.now();
  await migrate(getDb(), { migrationsFolder: MIGRATIONS_FOLDER });
  console.log(`[db] migrations applied (${Date.now() - t0}ms)`);
}
