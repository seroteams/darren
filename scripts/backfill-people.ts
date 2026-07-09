// Dev-only backfill: give every EXISTING finished/in-progress run a roster person, so the
// people table (people-roster) matches the history the Team page was already showing. For
// each run owned by a real user, we resolve the run's free-typed ctx.name through that
// manager's Team merges/renames (the alias sidecar) to a single canonical person, find-or-
// create that roster row, and stamp its id into the run's session state IN THE DATABASE
// (postgres-runtime-data P7 — no disk state-file write). Idempotent: a run that already
// carries a personId is skipped, and the roster
// dedupes by normalized name, so re-running changes nothing. Refuses to run in production.
//
//   node scripts/backfill-people.ts --dry-run   # preview only, writes nothing
//   node scripts/backfill-people.ts             # stamp for real

import "../backend/api/env-boot.ts"; // load .env (DATABASE_URL) before the db client reads it
import { closeDb, hasDatabaseUrl } from "../backend/db/client.ts";
import { walkRuns } from "../backend/engine/run-history.ts";
import { teamService } from "../backend/api/services/team/team.service.ts";
import { peopleService } from "../backend/api/services/team/people.service.ts";
import { aliasedPersonName, normalizeKey } from "../backend/api/services/team/alias-resolve.ts";
import type { PeopleAliases } from "../backend/api/services/team/team.repo.ts";
import { hydrateSession } from "../backend/api/session-persistence.ts";
import type { PersistedSession } from "../backend/api/session-persistence.ts";
import { upsertSession } from "../backend/db/sessions-store.ts";
import { asRecord, asString, isObjectRecord } from "../backend/shared/guards.ts";

const DRY_RUN = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("backfill-people is a dev helper — refusing to run in production.");
  }
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not set — the roster + session mirror live in Postgres.");
  }

  console.log(`Backfilling roster people${DRY_RUN ? " (dry run — no writes)" : ""}.\n`);

  const aliasCache = new Map<string, PeopleAliases>();
  const getAliases = async (userId: string): Promise<PeopleAliases> => {
    let a = aliasCache.get(userId);
    if (!a) { a = await teamService.getAliases(userId); aliasCache.set(userId, a); }
    return a;
  };

  // For the dry run only: existing roster keys per manager, so we can say create vs reuse
  // without touching the store. Seeded from the DB once per manager, grown as we preview.
  const previewKeys = new Map<string, Set<string>>();
  async function previewRosterKeys(orgId: string, managerId: string): Promise<Set<string>> {
    let set = previewKeys.get(managerId);
    if (!set) {
      const { people } = await peopleService.list(orgId, managerId);
      set = new Set(people.map((p) => normalizeKey(p.name)));
      previewKeys.set(managerId, set);
    }
    return set;
  }

  let scanned = 0, stamped = 0, created = 0, reused = 0;
  let skippedNoLink = 0, skippedAlready = 0, mirrorFailed = 0;

  for (const { id, dir, state } of walkRuns()) {
    if (!isObjectRecord(state)) continue;
    const orgId = asString(state.orgId) || null;
    const userId = asString(state.userId) || null;
    const ctx = asRecord(state.ctx);
    const name = asString(ctx.name).trim();

    if (!orgId || !userId || !name) { skippedNoLink++; continue; }
    scanned++;

    if (asString(state.personId)) { skippedAlready++; continue; } // already linked — idempotent

    const targetName = aliasedPersonName(await getAliases(userId), name);

    if (DRY_RUN) {
      const keys = await previewRosterKeys(orgId, userId);
      const key = normalizeKey(targetName);
      const isNew = !keys.has(key);
      if (isNew) { keys.add(key); created++; } else { reused++; }
      console.log(`  ${id}  "${name}" → ${isNew ? "CREATE" : "reuse"} person "${targetName}"`);
      continue;
    }

    // Find-or-create the roster row (create dedupes on normalized name), then stamp it.
    const before = (await peopleService.list(orgId, userId)).people.length;
    const personId = await peopleService.resolveForRun(orgId, userId, {
      name: targetName,
      role: ctx.role,
      seniority: ctx.seniority,
    });
    if (!personId) { skippedNoLink++; continue; }
    const after = (await peopleService.list(orgId, userId)).people.length;
    if (after > before) created++; else reused++;

    // P7: stamp personId straight into the DB row — no disk state-file write.
    const updated = { ...(state as unknown as PersistedSession), personId };
    stamped++;
    try {
      await upsertSession(hydrateSession(updated, dir));
    } catch (e) {
      mirrorFailed++;
      console.warn(`    ⚠ DB mirror failed for ${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
    console.log(`  ${id}  "${name}" → person ${personId} ("${targetName}")`);
  }

  console.log(
    `\nDone. scanned ${scanned} linkable run(s): ` +
    (DRY_RUN
      ? `would stamp ${created + reused} (${created} new / ${reused} reused people).`
      : `stamped ${stamped} (${created} new / ${reused} reused people)` +
        (mirrorFailed ? `, ${mirrorFailed} DB-mirror failure(s).` : ".")),
  );
  console.log(`  skipped ${skippedAlready} already-linked · ${skippedNoLink} without org/user/name.`);
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => closeDb());
