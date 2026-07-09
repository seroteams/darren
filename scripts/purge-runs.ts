// Retire-the-files cleanup (postgres-runtime-data P7). Replaces scripts/purge-logs.js:
// removes runs that are no longer useful from BOTH the database (the store the app now
// reads) AND disk (echo copies + legacy dirs). Two groups, same policy as before:
//   1. Archived — runs you marked not-useful in the Library. In DB mode that's
//      sessions.archived_at IS NOT NULL; DB-less it's the on-disk archive flag.
//   2. Machine-made — gate/benchmark/sweep test sessions that have no session-state
//      (so they were never written to the DB — disk only). Their verdicts already live
//      in logs/gate|benchmark|sweeps. A run with any review marks is never machine-made.
// Everything else (your own runs) is never listed and never deleted.
//
//   node scripts/purge-runs.ts            dry-run: list what would be removed
//   node scripts/purge-runs.ts --delete   remove them (DB rows + disk dirs)
//
// Exit: 0 ok · 2 infra error.

import "../backend/api/env-boot.ts"; // load .env (DATABASE_URL) before the db client reads it
import fs from "node:fs";
import path from "node:path";
import { inArray, isNotNull } from "drizzle-orm";
import { getDb, closeDb, hasDatabaseUrl } from "../backend/db/client.ts";
import { sessions as sessionsTable, runArtifacts } from "../backend/db/schema.ts";
import { LOGS_ROOT } from "../backend/engine/session.ts";
import { isArchivedAt, reviewSummaryOf } from "../backend/engine/run-history.ts";

const RUN_ID_RE = /\b\d{4}_[A-Z][a-z]{2}\d{2}_\d{2}-\d{2}-[0-9a-f]{8}\b/g;
const RUN_DIR_RE = /^\d{4}_[A-Z][a-z]{2}\d{2}_\d{2}-\d{2}-[0-9a-f]{8}$/;

// --- disk helpers (ported from purge-logs.js) ---

/** Every run directory under logs/<month>/, including script-spawned sessions with no
 *  session-state.json. Recognised by name shape, so ISO-named result folders are skipped. */
function walkRunDirs(): Array<{ id: string; dir: string }> {
  const out: Array<{ id: string; dir: string }> = [];
  if (!fs.existsSync(LOGS_ROOT)) return out;
  for (const monthEntry of fs.readdirSync(LOGS_ROOT, { withFileTypes: true })) {
    if (!monthEntry.isDirectory()) continue;
    const monthDir = path.join(LOGS_ROOT, monthEntry.name);
    for (const entry of fs.readdirSync(monthDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !RUN_DIR_RE.test(entry.name)) continue;
      out.push({ id: entry.name, dir: path.join(monthDir, entry.name) });
    }
  }
  return out;
}

function readJson(filePath: string): { cases?: Array<{ session?: unknown }> } | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function collectIdsFromJsonFiles(root: string, refs: Set<string>): void {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) collectIdsFromJsonFiles(full, refs);
    else if (entry.name.endsWith(".json")) {
      for (const m of fs.readFileSync(full, "utf8").match(RUN_ID_RE) || []) refs.add(m);
    }
  }
}

/** Run ids referenced as test sessions by gate/benchmark/sweep result files. */
function collectMachineRefs(): Set<string> {
  const refs = new Set<string>();
  const gateRoot = path.join(LOGS_ROOT, "gate");
  if (fs.existsSync(gateRoot)) {
    for (const entry of fs.readdirSync(gateRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const result = readJson(path.join(gateRoot, entry.name, "result.json"));
      for (const c of result?.cases || []) if (c.session) refs.add(path.basename(String(c.session)));
    }
  }
  for (const name of ["benchmark", "sweeps"]) collectIdsFromJsonFiles(path.join(LOGS_ROOT, name), refs);
  return refs;
}

function dirSizeBytes(dir: string): number {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSizeBytes(full) : fs.statSync(full).size;
  }
  return total;
}

const mb = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(1) + " MB";

/** Belt-and-braces: only ever remove a run-shaped directory inside LOGS_ROOT. */
function rmRunDir(dir: string): void {
  if (!dir.startsWith(LOGS_ROOT) || !RUN_DIR_RE.test(path.basename(dir))) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

// --- database: archived runs (the app reads runs from here now) ---

async function archivedKeysFromDb(): Promise<Array<{ key: string; logDir: string | null }>> {
  const rows = await getDb()
    .select({ key: sessionsTable.sessionKey, logDir: sessionsTable.logDir })
    .from(sessionsTable)
    .where(isNotNull(sessionsTable.archivedAt));
  return rows.map((r) => ({ key: r.key, logDir: r.logDir ?? null }));
}

/** Delete the given runs from the DB. The run_artifacts→sessions FK was dropped
 *  (migration 0011) so artifacts are cleared explicitly, then the session rows. */
async function deleteRunsFromDb(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const db = getDb();
  await db.delete(runArtifacts).where(inArray(runArtifacts.sessionKey, keys));
  await db.delete(sessionsTable).where(inArray(sessionsTable.sessionKey, keys));
}

async function main(): Promise<void> {
  const doDelete = process.argv.includes("--delete");
  const dbMode = hasDatabaseUrl();

  // Archived: from the DB when configured (the authoritative store), else the disk flag.
  const archivedDb = dbMode ? await archivedKeysFromDb() : [];
  const archivedDiskOnly = dbMode
    ? []
    : walkRunDirs().filter((r) => isArchivedAt(r.dir)).map((r) => ({ key: r.id, logDir: r.dir }));
  const archived = dbMode ? archivedDb : archivedDiskOnly;

  // Machine-made: always disk-derived — these no-state test dirs were never in the DB.
  const machineRefs = collectMachineRefs();
  const machine = walkRunDirs().filter((r) => {
    if (isArchivedAt(r.dir)) return false;
    const review = reviewSummaryOf(r.dir);
    return machineRefs.has(r.id) && review.decided === 0 && !review.overall;
  });

  if (archived.length === 0 && machine.length === 0) {
    console.log("0 archived runs and 0 machine-made test runs — nothing to purge.");
    return;
  }

  console.log(`Archived by you (${archived.length})${dbMode ? " — from the database" : ""}:`);
  for (const a of archived) console.log(`  ${a.key}${a.logDir && fs.existsSync(a.logDir) ? `  (+ disk ${mb(dirSizeBytes(a.logDir))})` : ""}`);
  console.log(`\nMachine-made test runs (${machine.length}) — disk only:`);
  for (const m of machine) console.log(`  ${m.id}  ${mb(dirSizeBytes(m.dir))}`);

  if (!doDelete) {
    console.log("\nDry run — nothing deleted. Run with --delete to remove these.");
    console.log("Gate verdicts + failure details stay in logs/gate/*/result.json.");
    return;
  }

  // 1. DB rows for the archived runs (the app stops listing them immediately).
  await deleteRunsFromDb(archived.map((a) => a.key));
  // 2. Best-effort disk cleanup: archived echo dirs + machine-made no-state dirs.
  let removedDirs = 0;
  for (const a of archived) {
    if (a.logDir && fs.existsSync(a.logDir)) { rmRunDir(a.logDir); removedDirs++; }
  }
  for (const m of machine) { rmRunDir(m.dir); removedDirs++; }

  console.log(
    `\nDeleted ${archived.length} archived run(s)${dbMode ? " from the database" : ""} + ` +
    `${machine.length} machine-made test run(s); removed ${removedDirs} disk folder(s).`,
  );
}

main()
  .catch((err) => {
    console.error("purge-runs failed:", err instanceof Error ? err.message : err);
    process.exitCode = 2;
  })
  .finally(() => closeDb());
