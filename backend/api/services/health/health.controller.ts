import type { RequestContext } from "../../router.ts";
import { getDb, hasDatabaseUrl } from "../../../db/client.ts";
import { sql } from "drizzle-orm";

// Public liveness probe — Render's health check and the /release watch loop poll
// this anonymously, so it must stay auth-free and touch no disk, DB, or AI.
export function health(c: RequestContext): void {
  c.json(200, { ok: true });
}

// Deep readiness probe (audit F17) — liveness alone can report "healthy" while the
// database is unreachable and every write is failing. This one actually pings the DB
// so the release watch loop can tell a genuinely-serving instance from a wedged one.
// Kept unlinked + auth-free (like /health) but deliberately separate so Render's own
// health check never wakes Neon or flaps on a transient blip.
export async function healthDeep(c: RequestContext): Promise<void> {
  if (!hasDatabaseUrl()) {
    // File-mode (local, no DB) — nothing to ping; report ok so local dev isn't "degraded".
    c.json(200, { ok: true, db: "file-mode" });
    return;
  }
  try {
    await getDb().execute(sql`select 1`);
    c.json(200, { ok: true, db: "up" });
  } catch {
    c.json(503, { ok: false, db: "down" });
  }
}
