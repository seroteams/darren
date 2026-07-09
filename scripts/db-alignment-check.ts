// Live/local database alignment check (free, read-only, no OpenAI). Connects to the
// LOCAL database (DATABASE_URL) and the LIVE database (LIVE_DATABASE_URL) from .env,
// reads each one's environment marker, migration ledger, and the 0012 alignment-probe
// row, and reports side-by-side whether both carry exactly the repo's migrations.
// The judging rules live in backend/db/alignment-check.ts (pure, unit-tested).
//
//   node scripts/db-alignment-check.ts
//   → ✅/❌ per rule; exits 1 on any drift. Never writes to either database.

import "../backend/api/env-boot.ts"; // load .env before reading DATABASE_URL / LIVE_DATABASE_URL
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { ROOT } from "../backend/engine/paths.mts";
import {
  evaluateAlignment,
  type AlignmentCheck,
  type DbSnapshot,
  type RepoMigrations,
} from "../backend/db/alignment-check.ts";

const JOURNAL_PATH = path.join(ROOT, "backend", "db", "migrations", "meta", "_journal.json");

function readRepoMigrations(): RepoMigrations {
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf8")) as {
    entries: { tag: string; when: number }[];
  };
  const head = journal.entries[journal.entries.length - 1];
  if (!head) throw new Error(`No migrations found in ${JOURNAL_PATH}`);
  return { count: journal.entries.length, headTag: head.tag, headWhen: head.when };
}

/** Postgres "relation does not exist" — the table hasn't been created there yet. */
function isMissingTable(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "42P01";
}

async function snapshotDatabase(url: string): Promise<DbSnapshot> {
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 15_000 });
  try {
    let envMarker: string | null = null;
    let probePresent = false;
    try {
      const state = await pool.query(
        `SELECT key, value FROM app_state WHERE key IN ('environment', 'alignment_probe')`,
      );
      for (const row of state.rows as { key: string; value: unknown }[]) {
        if (row.key === "environment" && typeof row.value === "string") envMarker = row.value;
        if (row.key === "alignment_probe") probePresent = true;
      }
    } catch (e) {
      if (!isMissingTable(e)) throw e;
    }

    let migrationCount: number | null = null;
    let migrationHeadWhen: number | null = null;
    try {
      const ledger = await pool.query(
        `SELECT count(*)::int AS count, max(created_at)::bigint AS head FROM drizzle.__drizzle_migrations`,
      );
      const row = ledger.rows[0] as { count: number; head: string | null };
      migrationCount = row.count;
      migrationHeadWhen = row.head == null ? null : Number(row.head);
    } catch (e) {
      if (!isMissingTable(e)) throw e;
    }

    return { reachable: true, envMarker, migrationCount, migrationHeadWhen, probePresent };
  } catch (e) {
    return {
      reachable: false,
      error: e instanceof Error ? e.message : String(e),
      envMarker: null,
      migrationCount: null,
      migrationHeadWhen: null,
      probePresent: false,
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

function printChecks(checks: AlignmentCheck[]): void {
  const width = Math.max(...checks.map((c) => c.name.length));
  for (const c of checks) {
    console.log(`${c.ok ? "✅" : "❌"} ${c.name.padEnd(width)}  ${c.detail}`);
  }
}

async function main(): Promise<void> {
  const localUrl = process.env.DATABASE_URL;
  const liveUrl = process.env.LIVE_DATABASE_URL;
  if (!localUrl) throw new Error("DATABASE_URL is not set — add your local database to .env first.");
  if (!liveUrl) throw new Error("LIVE_DATABASE_URL is not set — park the live connection string in .env first.");

  const repo = readRepoMigrations();
  console.log(`Repo expects ${repo.count} migrations, head ${repo.headTag}\n`);

  const [local, live] = await Promise.all([snapshotDatabase(localUrl), snapshotDatabase(liveUrl)]);
  const checks = evaluateAlignment({ repo, local, live });
  printChecks(checks);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(
    failed === 0
      ? "\nAligned: live and local both carry exactly the repo's migrations."
      : `\nDrift: ${failed} check(s) failed — see ❌ rows above.`,
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
