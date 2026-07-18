#!/usr/bin/env node
// Database backup (audit F2) — a plain pg_dump of the Postgres database named by
// DATABASE_URL to a timestamped file under backups/. Read-only: it never writes to the
// database, so it's safe to run against live. Free (no API). Restore steps live in
// docs/reference/db-backup-restore.md.
//
//   node scripts/backup-db.js            # dump the DB in DATABASE_URL (or .env)
//   DATABASE_URL=... node scripts/backup-db.js
//
// Needs the Postgres client tools (pg_dump) on PATH. On a schedule, wire this to cron /
// a GitHub Action; ad hoc, run it before any risky migration.

import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^\s*DATABASE_URL\s*=\s*(.+?)\s*$/.exec(line);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

const url = databaseUrl();
if (!url) {
  console.error("No DATABASE_URL set (and none in .env). Nothing to back up.");
  process.exit(1);
}

const dir = path.join(ROOT, "backups");
mkdirSync(dir, { recursive: true });
// Timestamp YYYYMMDD-HHMMSS (UTC).
const iso = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-");
const stamp = iso.slice(0, 15); // YYYYMMDD-HHMMSS
const outFile = path.join(dir, `sero-${stamp}.dump`);

console.log(`[backup] dumping database → ${path.relative(ROOT, outFile)}`);
// Custom format (-Fc): compressed, restorable with pg_restore. --no-owner keeps the dump
// portable across roles (Neon vs local).
const res = spawnSync("pg_dump", [url, "-Fc", "--no-owner", "-f", outFile], { stdio: "inherit" });
if (res.error) {
  console.error(
    res.error.code === "ENOENT"
      ? "[backup] pg_dump not found on PATH. Install the Postgres client tools and retry."
      : `[backup] pg_dump failed: ${res.error.message}`,
  );
  process.exit(1);
}
if (res.status !== 0) {
  console.error(`[backup] pg_dump exited ${res.status}.`);
  process.exit(res.status ?? 1);
}
console.log(`[backup] done — ${path.relative(ROOT, outFile)}`);
