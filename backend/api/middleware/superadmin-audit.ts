// Superadmin access audit (pre-go-live PG6). The single most important compensating
// control for a cross-company key: every superadmin request appends one record, so if the
// key is ever used there's a trail. Called from the requireSuperadminRoute funnel AFTER the
// guard passes, so a refused (401/403) access is never recorded as a success.
//
// One appended JSONL line, NOT a logging subsystem — rotation/retention is parked. The sink
// is injectable so the funnel's behaviour is unit-tested without touching disk. Never record
// a secret or a request payload — identity + method + route only.

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "../../engine/paths.mts";
import { getDb, hasDatabaseUrl } from "../../db/client.ts";
import { auditLog } from "../../db/schema.ts";
import { shouldEchoToDisk } from "../../db/run-artifacts-store.ts";
import type { RequestIdentity } from "./request-context.ts";

export interface SuperadminAuditEntry {
  at: string; // ISO timestamp
  userId: string | null;
  email: string | null;
  method: string;
  route: string;
  // Mutation fields (user-management Phase 2 on). The read funnel omits these; a mutation
  // records its outcome + a human-readable, secret-free detail so blocked/failed attempts
  // leave a trail too. `target` is the user the action was aimed at.
  outcome?: "success" | "blocked" | "failed";
  target?: string;
  detail?: string;
}

/** Build the record from the request identity + route. Pure (timestamp passed in) so it's
 *  testable; carries no secret. */
export function superadminAuditEntry(
  identity: RequestIdentity,
  method: string,
  route: string,
  at: string,
): SuperadminAuditEntry {
  return { at, userId: identity.userId, email: identity.email, method, route };
}

const AUDIT_DIR = path.join(ROOT, "content", "data", "audit");
const AUDIT_FILE = path.join(AUDIT_DIR, "superadmin.jsonl");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The real sink (postgres-runtime-data Phase 5): one `audit_log` row per access
 *  when a database is configured (append-only by construction — this module has
 *  no update/delete), with the old JSONL line kept as the echo/rollback. DB-less
 *  mode stays file-only. An audit failure is surfaced to the caller as before —
 *  a cross-company access that can't be recorded should fail, not pass silently. */
export async function appendSuperadminAudit(entry: SuperadminAuditEntry): Promise<void> {
  if (hasDatabaseUrl()) {
    await getDb()
      .insert(auditLog)
      .values({
        // actor_user_id is a uuid FK — the dev side-door's synthetic id travels
        // in details.userId instead so the record is still complete.
        actorUserId: entry.userId && UUID_RE.test(entry.userId) ? entry.userId : null,
        action: `${entry.method} ${entry.route}`,
        details: {
          at: entry.at,
          userId: entry.userId,
          email: entry.email,
          ...(entry.outcome ? { outcome: entry.outcome } : {}),
          ...(entry.target ? { target: entry.target } : {}),
          ...(entry.detail ? { detail: entry.detail } : {}),
        },
      });
    if (!shouldEchoToDisk()) return;
  }
  await mkdir(AUDIT_DIR, { recursive: true });
  await appendFile(AUDIT_FILE, JSON.stringify(entry) + "\n", "utf8");
}
