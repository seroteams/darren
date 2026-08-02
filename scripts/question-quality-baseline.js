#!/usr/bin/env node
// sharper-questions P1 — the BEFORE numbers for question quality.
//
// Walks every saved run in logs/ and reports, per run and in total: how many asked
// questions moved no axis at all, and how many turns the agency rule fired on. Offline,
// $0, no AI. Read-only.
//
//   node scripts/question-quality-baseline.js
//   node scripts/question-quality-baseline.js --json
//
// It deliberately reuses buildRunHealth from the engine rather than re-implementing the
// counting here. If the two ever disagree the baseline stops being comparable with what
// live runs report, which would make the whole phase pointless.

const fs = require("node:fs");
const path = require("node:path");
const { buildRunHealth } = require("../backend/engine/run-health.ts");

const ROOT = path.join(__dirname, "..");
const LOGS = path.join(ROOT, "logs");

function findTranscripts(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findTranscripts(p, out);
    else if (e.name === "transcript.json") out.push(p);
  }
  return out;
}

function turnsOf(file) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Array.isArray(raw)) return raw;
    return raw.turns || raw.transcript || [];
  } catch {
    return null; // unreadable runs are reported, never silently counted as clean
  }
}

function main() {
  const json = process.argv.includes("--json");
  const files = findTranscripts(LOGS);
  const rows = [];
  let unreadable = 0;

  for (const f of files) {
    const turns = turnsOf(f);
    if (!turns) {
      unreadable += 1;
      continue;
    }
    const h = buildRunHealth(turns, false);
    rows.push({
      run: path.basename(path.dirname(f)),
      scored: h.scored_turns,
      zero: h.zero_signal_turns,
      agency: h.agency_fired,
    });
  }

  const totals = rows.reduce(
    (a, r) => ({ scored: a.scored + r.scored, zero: a.zero + r.zero, agency: a.agency + r.agency }),
    { scored: 0, zero: 0, agency: 0 },
  );
  const runsWithAgency = rows.filter((r) => r.agency > 0);
  const pct = totals.scored ? ((totals.zero / totals.scored) * 100).toFixed(1) : "0.0";

  if (json) {
    console.log(JSON.stringify({ runs: rows.length, unreadable, totals, runsWithAgency, rows }, null, 2));
    return;
  }

  console.log(`\nQuestion quality baseline  ·  offline, no AI, $0\n`);
  console.log(`  runs read:            ${rows.length}${unreadable ? ` (${unreadable} unreadable)` : ""}`);
  console.log(`  questions asked:      ${totals.scored}`);
  console.log(`  bought nothing:       ${totals.zero}  (${pct}% of questions asked)`);
  console.log(`  agency rule fired:    ${totals.agency} turns, across ${runsWithAgency.length} run(s)`);
  if (runsWithAgency.length) {
    console.log(`\n  runs where it fired:`);
    for (const r of runsWithAgency) console.log(`    ${r.run}  (${r.agency})`);
  }
  const worst = [...rows].sort((a, b) => b.zero - a.zero).slice(0, 5);
  console.log(`\n  most wasted questions:`);
  for (const r of worst) console.log(`    ${r.zero}/${r.scored}  ${r.run}`);
  console.log("");
}

main();
