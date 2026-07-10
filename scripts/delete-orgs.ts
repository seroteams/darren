// Delete whole orgs (+ all their users/people/sessions/artifacts/invites/logs) in
// FK order. Local DB only — the env-guard refuses to run against the live database.
//   node scripts/delete-orgs.ts <orgId> [<orgId> ...]            dry-run: counts only
//   node scripts/delete-orgs.ts <orgId> [<orgId> ...] --delete   actually remove them
import "../backend/api/env-boot.ts";
import { inArray, or } from "drizzle-orm";
import { getDb, closeDb } from "../backend/db/client.ts";
import {
  organizations, users, people, sessions, runArtifacts, invitations,
  authSessions, feedbackNotes, errorLogs, peopleAliases, auditLog, lexiconCandidates,
} from "../backend/db/schema.ts";

async function main(): Promise<void> {
  const doDelete = process.argv.includes("--delete");
  const orgIds = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (orgIds.length === 0) { console.error("Pass at least one org id."); process.exitCode = 2; return; }

  const db = getDb();

  // Guard: only touch orgs that actually exist, and never the system Default bucket.
  const found = await db.select().from(organizations).where(inArray(organizations.id, orgIds));
  const SYSTEM = "00000000-0000-0000-0000-000000000001";
  if (found.some((o) => o.id === SYSTEM)) { console.error("Refusing to delete the system Default org."); process.exitCode = 2; return; }
  const ids = found.map((o) => o.id);
  const missing = orgIds.filter((i) => !ids.includes(i));
  if (missing.length) console.log(`(skipping ${missing.length} id(s) not in DB: ${missing.join(", ")})`);
  if (ids.length === 0) { console.log("No matching orgs — nothing to do."); return; }

  // Resolve dependent keys.
  const us = await db.select({ id: users.id }).from(users).where(inArray(users.orgId, ids));
  const userIds = us.map((u) => u.id);
  const ss = await db.select({ key: sessions.sessionKey }).from(sessions).where(inArray(sessions.orgId, ids));
  const sessionKeys = ss.map((s) => s.key);

  console.log(`\nOrgs to delete (${ids.length}): ${found.map((o) => o.name).join(", ")}`);
  console.log(`  users=${userIds.length}  sessions=${sessionKeys.length}`);

  if (!doDelete) { console.log("\nDry run — nothing deleted. Re-run with --delete."); return; }

  // FK-ordered deletes: children first, org root last.
  const byUser = userIds.length ? inArray : null;
  if (authSessions) await db.delete(authSessions).where(or(inArray(authSessions.orgId, ids), byUser ? inArray(authSessions.userId, userIds) : inArray(authSessions.orgId, ids)));
  await db.delete(invitations).where(inArray(invitations.orgId, ids));
  if (userIds.length) await db.delete(peopleAliases).where(inArray(peopleAliases.userId, userIds));
  if (userIds.length) await db.delete(auditLog).where(inArray(auditLog.actorUserId, userIds));
  await db.delete(feedbackNotes).where(or(inArray(feedbackNotes.orgId, ids), userIds.length ? inArray(feedbackNotes.userId, userIds) : inArray(feedbackNotes.orgId, ids)));
  await db.delete(errorLogs).where(or(inArray(errorLogs.orgId, ids), userIds.length ? inArray(errorLogs.userId, userIds) : inArray(errorLogs.orgId, ids)));
  if (sessionKeys.length) await db.delete(lexiconCandidates).where(inArray(lexiconCandidates.sessionKey, sessionKeys));
  await db.delete(runArtifacts).where(inArray(runArtifacts.orgId, ids));
  if (sessionKeys.length) await db.delete(runArtifacts).where(inArray(runArtifacts.sessionKey, sessionKeys));
  await db.delete(sessions).where(inArray(sessions.orgId, ids));
  await db.delete(people).where(inArray(people.orgId, ids));
  await db.delete(users).where(inArray(users.orgId, ids));
  await db.delete(organizations).where(inArray(organizations.id, ids));

  console.log(`\nDeleted ${ids.length} org(s), ${userIds.length} user(s), ${sessionKeys.length} session(s).`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 2; })
  .finally(() => closeDb());
