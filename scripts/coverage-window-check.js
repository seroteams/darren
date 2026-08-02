#!/usr/bin/env node
// sharper-questions P3 — how wide is the axis-coverage window, really?
//
// Coverage (plan-turn.md <planning_rules> rule 6) can only fire on a turn where BOTH
// hold: enough turns have happened for the rule to bite, and wind-down has not started
// (<wind_down_rule> applies at remaining_budget <= 2, and it forbids a wellbeing probe).
//
//   remaining_budget after turn T of an N-turn session = N - T
//   wind-down has not started  <=>  N - T >= 3  <=>  T <= N - 3
//
// So the window is [opensAfter, N-3]. The old wording opened it after 3+ completed
// turns; the new wording opens it after 2. This walks every saved run and reports how
// many planning turns each wording actually leaves, which is the difference between a
// rule that can fire and a rule that cannot.
//
// Offline, $0, no AI, read-only.
//
//   node scripts/coverage-window-check.js

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const LOGS = path.join(ROOT, "logs");

const OLD_OPENS_AFTER = 3; // "hard at turn 4+ / after 3+ turns"
const NEW_OPENS_AFTER = 2; // "the window opens once 2+ turns are done"
const WIND_DOWN_BUDGET = 2; // <wind_down_rule> applies at remaining_budget <= 2

// Planning turns on which the rule can fire, given a session of `n` turns.
function windowTurns(n, opensAfter) {
  const last = n - (WIND_DOWN_BUDGET + 1); // largest T with remaining_budget >= 3
  const turns = [];
  for (let t = opensAfter; t <= last; t++) turns.push(t);
  return turns;
}

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

function main() {
  const files = findTranscripts(LOGS);
  const byLength = new Map();
  let unreadable = 0;

  for (const f of files) {
    let turns;
    try {
      const raw = JSON.parse(fs.readFileSync(f, "utf8"));
      turns = Array.isArray(raw) ? raw : raw.turns || raw.transcript || [];
    } catch {
      unreadable += 1;
      continue;
    }
    const n = turns.length;
    if (!n) continue;
    byLength.set(n, (byLength.get(n) || 0) + 1);
  }

  const lengths = [...byLength.keys()].sort((a, b) => a - b);
  let runsUnreachableBefore = 0;
  let runsWidened = 0;
  let total = 0;

  console.log("\naxis-coverage window — turns on which rule 6 can fire\n");
  console.log("  session   runs   before      after");
  console.log("  -------   ----   ---------   ---------");
  for (const n of lengths) {
    const runs = byLength.get(n);
    total += runs;
    const before = windowTurns(n, OLD_OPENS_AFTER);
    const after = windowTurns(n, NEW_OPENS_AFTER);
    if (!before.length) runsUnreachableBefore += runs;
    if (after.length > before.length) runsWidened += runs;
    const fmt = (w) => (w.length ? `turn ${w.join(", ")}` : "never");
    console.log(
      `  ${String(n).padStart(2)} turns   ${String(runs).padStart(4)}   ${fmt(before).padEnd(9)}   ${fmt(after)}`
    );
  }

  console.log("");
  console.log(`  runs read                         : ${total}`);
  console.log(`  runs where it could NEVER fire    : ${runsUnreachableBefore}`);
  console.log(`  runs whose window is now wider    : ${runsWidened}`);
  if (unreadable) console.log(`  unreadable runs                   : ${unreadable}`);
  console.log("");
}

main();
