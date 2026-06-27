#!/usr/bin/env node
// Offline regression replay (CLI front-end for scripts/lib/replay-suite.js).
//
// Re-grades every frozen run in evals/replay/ against the CURRENT code and flags
// any drift from its saved baseline. No API calls, $0. This is the deterministic
// half of the trust gate (scripts/gate.js) decoupled from the live, paid half.
//
//   npm run replay                          all cases
//   node scripts/replay-regression.js --only <id>
//   node scripts/replay-regression.js --update-baseline   re-freeze baselines
//   node scripts/replay-regression.js --json
//
// Drift in EITHER direction counts (so a safety test that quietly stops firing is
// caught too). Exit: 0 all good · 1 regression · 2 infra.

const { runSuite, updateBaseline } = require("./lib/replay-suite.ts");

function parseArgs(argv) {
  const args = { only: "", updateBaseline: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--only") args.only = String(argv[i + 1] || "").trim();
    if (argv[i] === "--update-baseline") args.updateBaseline = true;
    if (argv[i] === "--json") args.json = true;
  }
  return args;
}

function label(r) {
  const tag = r.kind === "adversarial" ? "  [safety test]" : "";
  return `${r.name} — ${r.meetingType}${tag}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { verdict, results, summary } = runSuite({ only: args.only });
  if (!results.length) {
    console.error(args.only ? `No saved case "${args.only}" in evals/replay/.` : "No saved cases in evals/replay/_index.json.");
    process.exit(2);
  }

  console.log(`\nRegression replay — ${results.length} case(s)  ·  offline, no AI\n`);
  for (const r of results) {
    if (r.status === "error") { console.log(`  ✗ ERROR        ${label(r)}\n      ${r.error}`); continue; }
    if (r.status === "no-baseline") { console.log(`  ? NEW          ${label(r)}  (no baseline yet — run --update-baseline)`); continue; }
    const mark = r.status === "regressed" ? "✗ needs a look" : "✓ still good  ";
    console.log(`  ${mark}  ${label(r)}   ${r.verdict}`);
    for (const reason of r.reasons || []) console.log(`        ${reason}`);
  }

  if (args.updateBaseline) {
    console.log("\nUpdating baselines:");
    for (const r of results) {
      const res = updateBaseline(r);
      if (res === "refused") console.warn(`  refusing to baseline ${r.id}: safety test is failing (${r.hardFails.join(", ")}) — fix it, don't baseline it.`);
      else if (res === "written") console.log(`  baselined ${r.id} → ${r.verdict}`);
    }
  }

  if (args.json) {
    console.log(JSON.stringify({ verdict, results: results.map((r) => ({ id: r.id, status: r.status, verdict: r.verdict, reasons: r.reasons })) }, null, 2));
  }
  console.log(`\n  ${verdict}  (${summary.ok} still good / ${summary.regressed} needs a look${summary.error ? ` / ${summary.error} error` : ""})  ·  $0, no AI\n`);
  process.exit(summary.error ? 2 : summary.regressed ? 1 : 0);
}

main();
