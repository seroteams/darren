#!/usr/bin/env node
// Restore a backup set made by scripts/backup-db.js (ndjson-v1 format) into a target
// Postgres database. The schema comes from the committed migrations, not the backup:
// run `npm run db:migrate` against the target FIRST, then this loads the rows.
//
//   node scripts/restore-db.js --from backups/sero-live-20260730-000922            # dry run
//   node scripts/restore-db.js --from backups/... --to "postgresql://..." --yes    # do it
//   node scripts/restore-db.js --from backups/... --verify-only                    # read the set, touch nothing
//
// DESTRUCTIVE with --yes: every table in the set is emptied and reloaded. Dry run is
// the default, and a target whose host matches the live service needs --force-live on
// top of --yes. Free (no API).

import { existsSync, readFileSync, createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BATCH = 200;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const has = (name) => process.argv.includes(name);

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "unknown-host";
  }
}

// Stream one table's rows without holding the whole (possibly 1GB) file in memory.
async function* readRows(file) {
  const stream = file.endsWith(".gz") ? createReadStream(file).pipe(createGunzip()) : createReadStream(file);
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.trim()) yield JSON.parse(line);
  }
}

function tableFile(dir, table) {
  for (const name of [`${table}.ndjson.gz`, `${table}.ndjson`]) {
    const p = path.join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

// json/jsonb columns must be handed to pg as strings, or an array value would be sent
// as a Postgres array literal instead of JSON.
async function jsonColumns(client, table) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 AND data_type IN ('json','jsonb')`,
    [table],
  );
  return new Set(rows.map((r) => r.column_name));
}

async function main() {
  const from = arg("--from");
  if (!from) throw new Error("--from <backup dir> is required.");
  const dir = path.resolve(ROOT, from);
  const manifestPath = path.join(dir, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`No manifest.json in ${dir} — not a backup set.`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.format !== "ndjson-v1") throw new Error(`Unsupported backup format: ${manifest.format}`);

  const expected = new Map(manifest.tables.map((t) => [t.table, t.rows]));
  console.log(`[restore] set: ${path.relative(ROOT, dir)}`);
  console.log(`[restore] taken: ${manifest.createdAt} from ${manifest.sourceHost} at migration ${manifest.migration}`);

  // Integrity read: every table file present, parses, and matches its manifest count.
  let problems = 0;
  for (const table of manifest.restoreOrder) {
    const file = tableFile(dir, table);
    if (!file) {
      console.error(`[restore]   ${table} — MISSING FILE`);
      problems += 1;
      continue;
    }
    let seen = 0;
    for await (const _row of readRows(file)) seen += 1;
    const want = expected.get(table) ?? 0;
    const ok = seen === want;
    if (!ok) problems += 1;
    console.log(`[restore]   ${table} — ${seen} rows ${ok ? "ok" : `MISMATCH (manifest says ${want})`}`);
  }
  if (problems) throw new Error(`${problems} table(s) failed the integrity read — this set is not trustworthy.`);
  console.log(`[restore] integrity: all ${manifest.restoreOrder.length} tables readable and counts match.`);

  if (has("--verify-only")) return;

  const to = arg("--to") ?? process.env.RESTORE_DATABASE_URL;
  if (!to) {
    console.log(`[restore] DRY RUN — no --to target given, nothing was written.`);
    return;
  }
  const host = safeHost(to);
  if (!has("--yes")) {
    console.log(`[restore] DRY RUN — would empty and reload ${manifest.restoreOrder.length} tables on ${host}.`);
    console.log(`[restore] add --yes to actually do it.`);
    return;
  }
  if (/onrender|sero-live/i.test(to) === false && manifest.label === "live" && !has("--force-live")) {
    // Belt and braces: a live-labelled set going somewhere unexpected is worth a pause.
    console.log(`[restore] set is labelled "live" and the target is ${host}. Add --force-live to confirm.`);
    return;
  }

  const client = new pg.Client({ connectionString: to });
  await client.connect();
  console.log(`[restore] loading into ${host} …`);
  await client.query("BEGIN");
  // Children first on the way out, parents first on the way in.
  for (const table of [...manifest.restoreOrder].reverse()) {
    await client.query(`DELETE FROM "${table}"`);
  }
  for (const table of manifest.restoreOrder) {
    const file = tableFile(dir, table);
    const jsonCols = await jsonColumns(client, table);
    let batch = [];
    let loaded = 0;
    const flush = async () => {
      if (!batch.length) return;
      const cols = Object.keys(batch[0]);
      const values = [];
      const tuples = batch.map((row, r) => {
        const placeholders = cols.map((c, i) => {
          const v = row[c];
          values.push(jsonCols.has(c) && v !== null && typeof v !== "string" ? JSON.stringify(v) : v);
          return `$${r * cols.length + i + 1}`;
        });
        return `(${placeholders.join(",")})`;
      });
      await client.query(
        `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES ${tuples.join(",")}`,
        values,
      );
      loaded += batch.length;
      batch = [];
    };
    for await (const row of readRows(file)) {
      batch.push(row);
      if (batch.length >= BATCH) await flush();
    }
    await flush();
    console.log(`[restore]   ${table} — ${loaded} rows`);
  }
  await client.query("COMMIT");
  await client.end();
  console.log(`[restore] done — ${host} now matches the set from ${manifest.createdAt}.`);
}

main().catch((e) => {
  console.error(`[restore] failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
