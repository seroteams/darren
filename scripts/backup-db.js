#!/usr/bin/env node
// Database backup (audit F2) — a timestamped copy of the Postgres database named by
// DATABASE_URL, under backups/. Read-only: it never writes to the database, so it's
// safe to run against live. Free (no API). Restore steps live in
// docs/reference/db-backup-restore.md.
//
//   node scripts/backup-db.js                 # dump the DB in DATABASE_URL (or .env)
//   DATABASE_URL=... node scripts/backup-db.js
//   node scripts/backup-db.js --label live    # tag the set (defaults to the DB host)
//
// Two formats, picked automatically:
//   pg_dump on PATH  → backups/sero-<stamp>.dump   (one compressed file, pg_restore)
//   pg_dump missing  → backups/sero-<stamp>/       (one gzipped NDJSON file per table +
//                      manifest.json, restored by scripts/restore-db.js)
// The NDJSON path exists because this machine has no Postgres client tools; the schema
// half of a restore comes from the committed migrations, so data-only is sufficient.

import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, createWriteStream, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";
import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = 500; // rows per fetch — keeps a 60MB table off the heap

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

// Host only, never the credentials — this string is safe to print and to record.
function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "unknown-host";
  }
}

// The migration the dump was taken at, so a restore knows which schema to build first.
function latestMigration() {
  const journal = path.join(ROOT, "backend", "db", "migrations", "meta", "_journal.json");
  if (!existsSync(journal)) return null;
  try {
    const entries = JSON.parse(readFileSync(journal, "utf8")).entries ?? [];
    return entries.at(-1)?.tag ?? null;
  } catch {
    return null;
  }
}

// Parent-before-child order, so a restore can insert straight down the list without
// tripping a foreign key. Tables in an FK cycle (none today) fall to the end.
function topoSort(tables, edges) {
  const remaining = new Set(tables);
  const ordered = [];
  while (remaining.size) {
    const ready = [...remaining].filter(
      (t) => !(edges.get(t) ?? []).some((parent) => parent !== t && remaining.has(parent)),
    );
    if (!ready.length) {
      ordered.push(...remaining);
      break;
    }
    ready.sort();
    for (const t of ready) {
      ordered.push(t);
      remaining.delete(t);
    }
  }
  return ordered;
}

async function ndjsonBackup(url, outDir, label) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  // One consistent snapshot for the whole export — a run mid-dump can't half-land.
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");

  const { rows: tableRows } = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
  );
  const tables = tableRows.map((r) => r.table_name).filter((t) => !t.startsWith("__drizzle"));

  const { rows: fkRows } = await client.query(
    `SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent
       FROM pg_constraint c
       JOIN pg_class r ON r.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE c.contype = 'f' AND n.nspname = 'public'`,
  );
  const edges = new Map();
  for (const { child, parent } of fkRows) {
    const key = child.replace(/^public\./, "").replace(/"/g, "");
    const par = parent.replace(/^public\./, "").replace(/"/g, "");
    edges.set(key, [...(edges.get(key) ?? []), par]);
  }
  const order = topoSort(tables, edges);

  mkdirSync(outDir, { recursive: true });
  const counts = [];
  for (const table of order) {
    // Gzipped: run_artifacts alone is ~1GB of raw JSON, which no nightly retention
    // window can carry uncompressed.
    const file = path.join(outDir, `${table}.ndjson.gz`);
    const gzip = createGzip();
    const written = new Promise((resolve, reject) => {
      const sink = createWriteStream(file);
      sink.on("finish", resolve);
      sink.on("error", reject);
      gzip.on("error", reject);
      gzip.pipe(sink);
    });
    let offset = 0;
    let rows = 0;
    for (;;) {
      // ORDER BY ctid is stable inside the snapshot and needs no primary key.
      const page = await client.query(
        `SELECT * FROM "${table}" ORDER BY ctid LIMIT ${PAGE} OFFSET ${offset}`,
      );
      if (!page.rows.length) break;
      for (const row of page.rows) {
        // Respect backpressure — a 1GB table will outrun the gzip stream otherwise.
        if (!gzip.write(`${JSON.stringify(row)}\n`)) {
          await new Promise((resolve) => gzip.once("drain", resolve));
        }
      }
      rows += page.rows.length;
      offset += PAGE;
      if (page.rows.length < PAGE) break;
    }
    gzip.end();
    await written;
    counts.push({ table, rows, bytes: statSync(file).size });
    console.log(`[backup]   ${table} — ${rows} rows`);
  }

  await client.query("COMMIT");
  await client.end();

  const manifest = {
    format: "ndjson-v1",
    createdAt: new Date().toISOString(),
    label,
    sourceHost: safeHost(url),
    migration: latestMigration(),
    restoreOrder: order,
    tables: counts,
  };
  writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main() {
  const url = databaseUrl();
  if (!url) {
    console.error("No DATABASE_URL set (and none in .env). Nothing to back up.");
    process.exit(1);
  }
  const labelArg = process.argv.indexOf("--label");
  const label = labelArg > -1 ? process.argv[labelArg + 1] : safeHost(url);

  mkdirSync(path.join(ROOT, "backups"), { recursive: true });
  // Timestamp YYYYMMDD-HHMMSS (UTC).
  const iso = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-");
  const stamp = iso.slice(0, 15);

  const hasPgDump = spawnSync("pg_dump", ["--version"], { stdio: "ignore" }).error === undefined;

  if (hasPgDump) {
    const outFile = path.join(ROOT, "backups", `sero-${label}-${stamp}.dump`);
    console.log(`[backup] ${safeHost(url)} → ${path.relative(ROOT, outFile)}`);
    // Custom format (-Fc): compressed, restorable with pg_restore. --no-owner keeps the
    // dump portable across roles (Neon vs local).
    const res = spawnSync("pg_dump", [url, "-Fc", "--no-owner", "-f", outFile], { stdio: "inherit" });
    if (res.status !== 0) {
      console.error(`[backup] pg_dump exited ${res.status}.`);
      process.exit(res.status ?? 1);
    }
    const mb = (statSync(outFile).size / 1024 / 1024).toFixed(1);
    console.log(`[backup] done — ${path.relative(ROOT, outFile)} (${mb} MB)`);
    return;
  }

  const outDir = path.join(ROOT, "backups", `sero-${label}-${stamp}`);
  console.log(`[backup] pg_dump not on PATH — per-table export instead.`);
  console.log(`[backup] ${safeHost(url)} → ${path.relative(ROOT, outDir)}/`);
  const manifest = await ndjsonBackup(url, outDir, label);
  const totalRows = manifest.tables.reduce((n, t) => n + t.rows, 0);
  const mb = (manifest.tables.reduce((n, t) => n + t.bytes, 0) / 1024 / 1024).toFixed(1);
  console.log(
    `[backup] done — ${manifest.tables.length} tables, ${totalRows} rows, ${mb} MB at migration ${manifest.migration ?? "unknown"}`,
  );
}

main().catch((e) => {
  console.error(`[backup] failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
