#!/usr/bin/env node
/*
 * lint-prompt-size.js — the prompt size budget.
 *
 * WHY THIS EXISTS: content/prompts/plan-turn.md is the planner's rule sheet. It
 * runs once per question, about six times a session, so it drives the majority of
 * a run's cost, and a long rule sheet is also a quality problem — a model reading
 * sixty rules follows each one less reliably.
 *
 * It was trimmed on 2026-07-10 from 45,576 to 27,594 characters, then grew back to
 * 38,555 in three weeks (+40%), a third of that in the last three days, as unrelated
 * features each bolted on a rule. Nobody was careless. There was simply no cap.
 * This is the cap.
 *
 * Only the `## System` half is measured: that is the rule sheet, the part re-sent
 * whole on every turn. The `## User` half is the session's own data and grows with
 * the conversation, so a fixed budget there would be meaningless.
 *
 * Pure Node (fs + regex). NO deps, NO install, NO network, NO OpenAI — always free.
 * Sibling of scripts/lint-copy.js and scripts/lint-design-tokens.js.
 *
 * RAISING A CAP IS A DECISION, NOT A CHORE. If a prompt genuinely needs to be
 * bigger, raise the number here in its own commit that says why. What this guard
 * exists to stop is the cap moving as a silent side effect of unrelated work.
 *
 * Usage:  node scripts/lint-prompt-size.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// One row per prompt under budget. `capChars` covers the `## System` block only.
// Set from the measured size at the time the cap was agreed, plus ~1% headroom.
// The headroom is deliberately about a third of a paragraph: a wording fix or an
// added sentence passes, a whole new rule does not. That is the growth this
// guard was built to catch — the rule sheet grew 40% one rule at a time.
const BUDGETS = [
  {
    file: "content/prompts/plan-turn.md",
    label: "planner rule sheet",
    capChars: 34400,
    setOn: "2026-08-02",
    note: "Set after planner-prompt-trim phase 1 (measured 34,063, 337 to spare).",
  },
];

// Rough token estimate for the human reading the output. Measured against seven
// real runs' logged prompts, chars/4 ran about 3% high, hence the 0.968.
const estTokens = (chars) => Math.round((chars / 4) * 0.968);
const n = (x) => x.toLocaleString("en-GB");

function systemBlockOf(text) {
  const m = text.match(/## System\s+([\s\S]*?)\n## User/);
  return m ? m[1] : null;
}

const results = [];
for (const b of BUDGETS) {
  const abs = path.join(ROOT, b.file);
  let text;
  try {
    text = fs.readFileSync(abs, "utf8");
  } catch {
    results.push({ ...b, status: "missing" });
    continue;
  }
  const sys = systemBlockOf(text);
  if (sys == null) {
    results.push({ ...b, status: "no-system-block" });
    continue;
  }
  const chars = sys.length;
  results.push({
    ...b,
    status: chars > b.capChars ? "over" : "ok",
    chars,
    over: chars - b.capChars,
    headroom: b.capChars - chars,
  });
}

console.log(`\nprompt size budget — ${results.length} prompt(s) under cap\n`);

let failed = false;
for (const r of results) {
  if (r.status === "missing") {
    failed = true;
    console.log(`  ✗ ${r.file} — not found. Has it moved? Update BUDGETS in scripts/lint-prompt-size.js.`);
    continue;
  }
  if (r.status === "no-system-block") {
    failed = true;
    console.log(`  ✗ ${r.file} — no "## System" section found, so there is nothing to measure.`);
    continue;
  }
  const pct = ((r.chars / r.capChars) * 100).toFixed(1);
  if (r.status === "over") {
    failed = true;
    console.log(`  ✗ ${r.label} (${r.file})`);
    console.log(`      ${n(r.chars)} characters, ~${n(estTokens(r.chars))} tokens`);
    console.log(`      cap is ${n(r.capChars)} — that is ${n(r.over)} over (${pct}% of budget)`);
  } else {
    console.log(`  ✓ ${r.label} (${r.file})`);
    console.log(`      ${n(r.chars)} characters, ~${n(estTokens(r.chars))} tokens`);
    console.log(`      cap is ${n(r.capChars)} — ${n(r.headroom)} to spare (${pct}% of budget)`);
  }
}

console.log("");

if (failed) {
  console.log(`FAIL — a prompt's rule sheet grew past its budget.`);
  console.log(`Two honest ways out:`);
  console.log(`  1. Make room. Something in there is said twice, or is an example that no`);
  console.log(`     longer earns its place. Cut that, not the rule you just added.`);
  console.log(`  2. Raise the cap on purpose, in scripts/lint-prompt-size.js, in its own`);
  console.log(`     commit saying why the prompt needs to be bigger.`);
  console.log(`What this guard exists to stop is the cap drifting up by accident.\n`);
  process.exit(1);
}

console.log(`PASS — every prompt is inside its size budget.\n`);
process.exit(0);
