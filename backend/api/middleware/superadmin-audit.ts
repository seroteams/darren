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
import type { RequestIdentity } from "./request-context.ts";

export interface SuperadminAuditEntry {
  at: string; // ISO timestamp
  userId: string | null;
  email: string | null;
  method: string;
  route: string;
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

/** The real sink — one JSONL line appended to a gitignored local file. */
export async function appendSuperadminAudit(entry: SuperadminAuditEntry): Promise<void> {
  await mkdir(AUDIT_DIR, { recursive: true });
  await appendFile(AUDIT_FILE, JSON.stringify(entry) + "\n", "utf8");
}
