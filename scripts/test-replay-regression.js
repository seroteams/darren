#!/usr/bin/env node
// Offline regression replay, wired as a unit test so `npm test` runs it on every
// pass. Re-grades the frozen runs in evals/replay/ against the CURRENT code and
// fails on any drift from their baselines. No API calls — same engine as
// `npm run replay` (scripts/replay-regression.js).

const { runSuite } = require("./lib/replay-suite");

const { results, summary } = runSuite();

if (!results.length) {
  console.error("FAIL  no saved cases in evals/replay/");
  process.exit(1);
}

for (const r of results) {
  if (r.status === "ok") continue;
  console.error(`  ${String(r.status).toUpperCase()}  ${r.name} — ${r.meetingType}`);
  for (const reason of r.reasons || []) console.error(`        ${reason}`);
  if (r.error) console.error(`        ${r.error}`);
}

const bad = summary.regressed + summary.error;
console.log(`replay regression: ${summary.ok}/${results.length} still good${bad ? ` — ${bad} need a look` : ""}`);
process.exit(bad ? 1 : 0);
