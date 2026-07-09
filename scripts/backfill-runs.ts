#!/usr/bin/env npx tsx
// Phase 6 (postgres-runtime-data) — import the old on-disk runs into Postgres.
// Purely additive and IDEMPOTENT (unique keys session_key / (session_key, stage,
// name) make re-runs safe); deletes nothing on disk. Honors the env guard —
// ALLOW_ENV_MISMATCH=1 is the one deliberate escape hatch for Carl's live import.
//
//   npx tsx scripts/backfill-runs.ts --dry-run           report only
//   npx tsx scripts/backfill-runs.ts                     import all runs (local DB)
//   npx tsx scripts/backfill-runs.ts --month=july        one month
//   npx tsx scripts/backfill-runs.ts --only=<run-id>     one run
//   npx tsx scripts/backfill-runs.ts --limit=25          first N runs
//   npx tsx scripts/backfill-runs.ts --questions         also import questions YAMLs
//   npx tsx scripts/backfill-runs.ts --stores            also import small stores
//
// FREE: touches Postgres only, never the OpenAI API.

import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "../backend/engine/env.ts";

loadEnv();

const args = new Set(process.argv.slice(2).filter((a) => !a.includes("=")));
const kv = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.includes("="))
    .map((a) => a.replace(/^--/, "").split("=", 2) as [string, string]),
);
const DRY = args.has("--dry-run");
const ONLY = kv.get("only") ?? null;
const MONTH = kv.get("month") ?? null;
const LIMIT = kv.get("limit") ? Number(kv.get("limit")) : Infinity;

// logs/ dirs that are dev-tool output, not runs — mirrors run-history SKIP_DIRS
// plus the report folders.
const SKIP_MONTH_DIRS = new Set(["probes", "gate", "sweeps", "benchmark"]);

/** How a run file lands in run_artifacts — mirrors the live write funnel:
 *  prompts are text, raw model responses stay text (parse failures must surface),
 *  everything else json when it parses. Exported shape for the unit test. */
export function kindFor(name: string): "text" | "json" | "jsonl" {
  if (name.endsWith(".md")) return "text";
  if (name.endsWith(".jsonl")) return "jsonl";
  if (/(^|-)response\.json$/.test(name) || name === "final.json") return "text";
  if (name.endsWith(".json")) return "json";
  return "text";
}

/** Sidecars fold into sessions columns, never run_artifacts. */
export const SIDECAR_FILES = new Set(["review.json", "rating.json", "archive.json", "session-state.json"]);

interface Totals {
  imported: number;
  skippedNoState: number;
  orphanedOrg: number;
  failed: number;
  artifacts: number;
  perMonth: Map<string, number>;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — nothing to import into.");
    process.exit(2);
  }
  const { runEnvironmentGuard } = await import("../backend/db/env-guard.ts");
  await runEnvironmentGuard(); // throws on a live/local mismatch unless ALLOW_ENV_MISMATCH=1

  const { LOGS_ROOT } = await import("../backend/engine/session.ts");
  const { hydrateSession } = await import("../backend/api/session-persistence.ts");
  const { upsertSession, ensureDefaultOrg } = await import("../backend/db/sessions-store.ts");
  const { queueArtifact, flushArtifactWrites } = await import("../backend/db/run-artifacts-store.ts");
  const { getDb, closeDb } = await import("../backend/db/client.ts");
  const { sessions: sessionsTable } = await import("../backend/db/schema.ts");
  const { eq } = await import("drizzle-orm");
  const { isObjectRecord } = await import("../backend/shared/guards.ts");

  const readJson = (file: string): unknown => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return null;
    }
  };

  const totals: Totals = { imported: 0, skippedNoState: 0, orphanedOrg: 0, failed: 0, artifacts: 0, perMonth: new Map() };

  // Runs whose stored orgId has no organizations row (old demo/test orgs cleaned
  // from this DB) can't be inserted — the FK would refuse. Skip + report honestly:
  // no real caller could fence-list them today either (their org matches nobody).
  const { organizations } = await import("../backend/db/schema.ts");
  const knownOrgs = new Set(
    (await getDb().select({ id: organizations.id }).from(organizations)).map((r) => r.id),
  );

  async function importRun(month: string, runDir: string): Promise<void> {
    const id = path.basename(runDir);
    const stateFile = path.join(runDir, "session-state.json");
    if (!fs.existsSync(stateFile)) {
      totals.skippedNoState++;
      return;
    }
    const state = readJson(stateFile);
    if (!isObjectRecord(state) || typeof state.id !== "string") {
      totals.skippedNoState++;
      return;
    }
    if (typeof state.orgId === "string" && state.orgId && !knownOrgs.has(state.orgId)) {
      totals.orphanedOrg++;
      return;
    }
    if (DRY) {
      totals.imported++;
      totals.perMonth.set(month, (totals.perMonth.get(month) ?? 0) + 1);
      return;
    }

    // 1. The session row (all denormalized columns via the live upsert path).
    const session = hydrateSession(state as Parameters<typeof hydrateSession>[0], runDir);
    await upsertSession(session);

    // 2. Sidecars → columns.
    const review = readJson(path.join(runDir, "review.json"));
    const rating = readJson(path.join(runDir, "rating.json"));
    const archive = readJson(path.join(runDir, "archive.json"));
    const archivedAt =
      isObjectRecord(archive) && archive.archived
        ? new Date(typeof archive.updatedAt === "string" ? archive.updatedAt : Date.now())
        : null;
    if (review !== null || rating !== null || archivedAt !== null) {
      await getDb()
        .update(sessionsTable)
        .set({
          ...(review !== null ? { review } : {}),
          ...(rating !== null ? { rating } : {}),
          ...(archivedAt !== null ? { archivedAt } : {}),
          updatedAt: new Date(),
        })
        .where(eq(sessionsTable.sessionKey, id));
    }

    // 3. Every other file → run_artifacts (root files stage "", stage dirs one level).
    const pushFile = (stage: string, name: string, abs: string): void => {
      const kind = kindFor(name);
      const text = fs.readFileSync(abs, "utf8");
      if (kind === "json") {
        const parsed = readJson(abs);
        if (parsed !== null) {
          queueArtifact({ sessionKey: id, stage, name, kind: "json", content: parsed });
        } else {
          queueArtifact({ sessionKey: id, stage, name, kind: "text", contentText: text });
        }
      } else {
        queueArtifact({ sessionKey: id, stage, name, kind, contentText: text });
      }
      totals.artifacts++;
    };
    for (const entry of fs.readdirSync(runDir, { withFileTypes: true })) {
      if (entry.isFile()) {
        if (SIDECAR_FILES.has(entry.name) || entry.name.endsWith(".tmp")) continue;
        pushFile("", entry.name, path.join(runDir, entry.name));
      } else if (entry.isDirectory()) {
        for (const f of fs.readdirSync(path.join(runDir, entry.name))) {
          if (f.endsWith(".tmp")) continue;
          pushFile(entry.name, f, path.join(runDir, entry.name, f));
        }
      }
    }
    totals.imported++;
    totals.perMonth.set(month, (totals.perMonth.get(month) ?? 0) + 1);
  }

  if (!DRY) await ensureDefaultOrg();

  let seen = 0;
  outer: for (const monthEntry of fs.readdirSync(LOGS_ROOT, { withFileTypes: true })) {
    if (!monthEntry.isDirectory() || SKIP_MONTH_DIRS.has(monthEntry.name)) continue;
    if (MONTH && monthEntry.name !== MONTH) continue;
    const monthDir = path.join(LOGS_ROOT, monthEntry.name);
    for (const runEntry of fs.readdirSync(monthDir, { withFileTypes: true })) {
      if (!runEntry.isDirectory()) continue;
      if (ONLY && runEntry.name !== ONLY) continue;
      if (seen >= LIMIT) break outer;
      seen++;
      try {
        await importRun(monthEntry.name, path.join(monthDir, runEntry.name));
      } catch (e) {
        totals.failed++;
        console.warn(`  FAILED ${runEntry.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
      // Keep the artifact queue bounded — settle per run.
      if (!DRY) await flushArtifactWrites();
    }
  }

  // Companion passes ---------------------------------------------------------
  if (args.has("--questions")) {
    const { QUESTIONS_ROOT, parseYaml } = await import("../backend/engine/questions.ts");
    const { generatedQuestions } = await import("../backend/db/schema.ts");
    let qCount = 0;
    const importYamlDir = async (dir: string, subdir: string): Promise<void> => {
      let files: string[] = [];
      try {
        files = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"));
      } catch {
        return;
      }
      for (const f of files) {
        const doc = parseYaml(fs.readFileSync(path.join(dir, f), "utf8"));
        const alias = String(doc.alias ?? f.replace(/\.yaml$/, ""));
        if (DRY) {
          qCount++;
          continue;
        }
        await getDb()
          .insert(generatedQuestions)
          .values({
            alias,
            subdir,
            source: typeof doc.source === "string" ? doc.source : null,
            label: typeof doc.label === "string" ? doc.label : null,
            stage: typeof doc.stage === "string" ? doc.stage : null,
            doc,
          })
          .onConflictDoNothing(); // alias conflicts: keep existing
        qCount++;
      }
    };
    await importYamlDir(QUESTIONS_ROOT, "");
    await importYamlDir(path.join(QUESTIONS_ROOT, "_runtime"), "_runtime");
    console.log(`  questions pass: ${qCount} YAMLs ${DRY ? "would be" : ""} offered (existing aliases kept)`);
  }

  if (args.has("--stores")) {
    const { DATA_DIR, LEXICONS_DIR } = await import("../backend/engine/paths.mts");
    const { peopleAliases, appState, auditLog, lexiconCandidates } = await import("../backend/db/schema.ts");
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let stores = 0;
    // people aliases (uuid-named files only — synthetic dev ids stay file-mode)
    const aliasDir = path.join(DATA_DIR, "people-aliases");
    for (const f of fs.existsSync(aliasDir) ? fs.readdirSync(aliasDir) : []) {
      const userId = f.replace(/\.json$/, "");
      if (!f.endsWith(".json") || !UUID_RE.test(userId)) continue;
      const doc = readJson(path.join(aliasDir, f));
      if (!isObjectRecord(doc)) continue;
      if (!DRY)
        await getDb()
          .insert(peopleAliases)
          .values({ userId, doc })
          .onConflictDoNothing(); // DB copy wins if one exists
      stores++;
    }
    // guest cap
    const cap = readJson(path.join(DATA_DIR, "guest-cap.json"));
    if (isObjectRecord(cap)) {
      if (!DRY)
        await getDb().insert(appState).values({ key: "guest-cap", value: cap }).onConflictDoNothing();
      stores++;
    }
    // audit jsonl → audit_log (append; re-runs duplicate, so only offer when table lacks rows)
    const auditFile = path.join(DATA_DIR, "audit", "superadmin.jsonl");
    if (fs.existsSync(auditFile)) {
      const existing = DRY ? [] : await getDb().select({ id: auditLog.id }).from(auditLog).limit(1);
      if (DRY || existing.length === 0) {
        for (const line of fs.readFileSync(auditFile, "utf8").split("\n")) {
          const entry = line.trim() ? readJsonText(line) : null;
          if (!isObjectRecord(entry)) continue;
          if (!DRY)
            await getDb()
              .insert(auditLog)
              .values({
                actorUserId: typeof entry.userId === "string" && UUID_RE.test(entry.userId) ? entry.userId : null,
                action: `${String(entry.method ?? "GET")} ${String(entry.route ?? "")}`,
                details: entry,
              });
          stores++;
        }
      } else {
        console.log("  audit pass skipped: audit_log already has rows (append-only — no safe merge)");
      }
    }
    // lexicon traces
    const suggestedDir = path.join(LEXICONS_DIR, "_suggested");
    for (const f of fs.existsSync(suggestedDir) ? fs.readdirSync(suggestedDir) : []) {
      if (!f.endsWith(".json")) continue;
      const doc = readJson(path.join(suggestedDir, f));
      if (!isObjectRecord(doc)) continue;
      if (!DRY)
        await getDb()
          .insert(lexiconCandidates)
          .values({ sessionKey: f.replace(/\.json$/, ""), doc })
          .onConflictDoNothing();
      stores++;
    }
    console.log(`  stores pass: ${stores} records ${DRY ? "would be" : ""} imported (role/arc overlays self-migrate at boot; people-profiles store is dead code)`);
  }

  function readJsonText(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  if (!DRY) await flushArtifactWrites();
  console.log(`\n${DRY ? "DRY RUN — would import" : "Imported"} ${totals.imported} run(s), ${totals.artifacts} artifact file(s).`);
  for (const [m, n] of [...totals.perMonth.entries()].sort()) console.log(`  ${m}: ${n}`);
  console.log(`  skipped (no session-state.json — invisible to the app today too): ${totals.skippedNoState}`);
  if (totals.orphanedOrg) console.log(`  skipped (org no longer exists in this DB — old demo/test orgs): ${totals.orphanedOrg}`);
  if (totals.failed) console.log(`  FAILED: ${totals.failed} (see warnings above)`);
  await closeDb();
  if (totals.failed) process.exit(1);
}

// Run only when executed directly — importing the pure helpers (kindFor,
// SIDECAR_FILES) for tests must never trigger an import run (the gate.js lesson).
if (process.argv[1] && path.basename(process.argv[1]).startsWith("backfill-runs")) {
  main().catch((e) => {
    console.error("backfill-runs crashed:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
