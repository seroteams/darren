#!/usr/bin/env node
// Purge run logs that are no longer useful.
//
// Lists two groups of runs under logs/<month>/:
//   1. Archived — runs marked not-useful in the Library (archive.json: archived true)
//   2. Machine-made — sessions spawned by the gate/benchmark/sweep scripts, whose
//      verdicts and failure details already live in logs/gate|benchmark|sweeps
//      result files. A run with any review marks is never treated as machine-made.
// Everything else (your own runs) is never listed and never deleted.
//
// Note: machine-made sessions have no session-state.json, so the Library (and
// run-history's walkRuns/deleteRun) can't see them — this script walks run
// directories directly and deletes by path.
//
//   npm run logs:purge              dry-run: list what would be removed
//   npm run logs:purge -- --delete  actually remove the listed run folders
//
// Exit: 0 ok · 2 infra error.

const fs = require("node:fs");
const path = require("node:path");

const { LOGS_ROOT } = require("../backend/engine/session");
const { isArchivedAt, reviewSummaryOf } = require("../backend/engine/run-history");

const RUN_ID_RE = /\b\d{4}_[A-Z][a-z]{2}\d{2}_\d{2}-\d{2}-[0-9a-f]{8}\b/g;
const RUN_DIR_RE = /^\d{4}_[A-Z][a-z]{2}\d{2}_\d{2}-\d{2}-[0-9a-f]{8}$/;

// Every run directory under logs/<month>/, including script-spawned sessions
// that have no session-state.json. Run dirs are recognised by name shape, so
// gate/benchmark/sweep result folders (ISO-timestamp names) are never included.
function walkRunDirs() {
  const out = [];
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

// Run ids referenced as test sessions by gate/benchmark/sweep result files.
function collectMachineRefs() {
  const refs = new Set();
  const gateRoot = path.join(LOGS_ROOT, "gate");
  if (fs.existsSync(gateRoot)) {
    for (const entry of fs.readdirSync(gateRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const result = readJson(path.join(gateRoot, entry.name, "result.json"));
      for (const c of result?.cases || []) {
        if (c.session) refs.add(path.basename(String(c.session)));
      }
    }
  }
  for (const name of ["benchmark", "sweeps"]) {
    collectIdsFromJsonFiles(path.join(LOGS_ROOT, name), refs);
  }
  return refs;
}

function collectIdsFromJsonFiles(root, refs) {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      collectIdsFromJsonFiles(full, refs);
    } else if (entry.name.endsWith(".json")) {
      const raw = fs.readFileSync(full, "utf8");
      for (const m of raw.match(RUN_ID_RE) || []) refs.add(m);
    }
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function dirSizeBytes(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

function mb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function describe({ run, review, size }) {
  let flag = "";
  if (review.overall === "fix" || review.overall === "block") {
    flag = `  ⚠ has open ${review.overall} verdict`;
  }
  return `  ${run.id}  ${mb(size)}${flag}`;
}

function main() {
  const doDelete = process.argv.includes("--delete");
  const machineRefs = collectMachineRefs();

  const archived = [];
  const machine = [];
  for (const run of walkRunDirs()) {
    const review = reviewSummaryOf(run.dir);
    const row = { run, review, size: dirSizeBytes(run.dir) };
    if (isArchivedAt(run.dir)) {
      archived.push(row);
    } else if (machineRefs.has(run.id) && review.decided === 0 && !review.overall) {
      machine.push(row);
    }
  }

  const all = [...archived, ...machine];
  if (all.length === 0) {
    console.log("0 archived runs and 0 machine-made test runs — nothing to purge.");
    return;
  }

  console.log(`Archived by you (${archived.length}):`);
  for (const row of archived) console.log(describe(row));
  console.log(`\nMachine-made test runs (${machine.length}):`);
  for (const row of machine) console.log(describe(row));

  const totalBytes = all.reduce((sum, row) => sum + row.size, 0);
  console.log(`\nTotal: ${all.length} runs, ${mb(totalBytes)}`);

  if (!doDelete) {
    console.log("\nDry run — nothing deleted. Run with --delete to remove these.");
    console.log("Gate verdicts and failure details stay in logs/gate/*/result.json;");
    console.log("only the test sessions' full transcripts and prompts are removed.");
    return;
  }

  let removed = 0;
  for (const { run } of all) {
    // Belt and braces: only ever remove a run-shaped directory inside LOGS_ROOT.
    if (!run.dir.startsWith(LOGS_ROOT) || !RUN_DIR_RE.test(path.basename(run.dir))) continue;
    fs.rmSync(run.dir, { recursive: true, force: true });
    removed += 1;
  }
  console.log(`\nDeleted ${removed} of ${all.length} runs — ${mb(totalBytes)} reclaimed.`);
}

try {
  main();
} catch (err) {
  console.error("purge-logs failed:", err.message);
  process.exit(2);
}
