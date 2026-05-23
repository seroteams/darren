#!/usr/bin/env node
//
// A/B probe for the bank generator prompt.
//
// Asks stage 1 for focus points once, then generates the bank TWICE:
//   A: the current generate-questions.md prompt
//   B: the current prompt + a "specificity rule" insertion that pushes the
//      model to write at least one question per focus point that makes a
//      generic answer visibly hollow.
//
// Prints both banks side-by-side so you can eyeball the quality shift.
// Restores the prompt file after the run. Total cost ~$0.003 on gpt-4o-mini.

const fs = require("node:fs");
const path = require("node:path");

const { loadEnv } = require("./src/env");
const { generateFocusPoints } = require("./src/generate");
const { generateBank } = require("./src/question-generator");
const cost = require("./src/cost");

loadEnv();

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY not set.");
  process.exit(2);
}

const PROMPT_PATH = path.join("prompts", "generate-questions.md");
const scenarioPath = process.argv[2] || "scenarios/001-senior-backend-weekly.json";
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

const ctx = {
  name: scenario.name,
  role: scenario.role,
  seniority: scenario.seniority,
  meetingType: scenario.meeting_type,
  notes: scenario.manager_notes,
};

const ORIGINAL_PROMPT = fs.readFileSync(PROMPT_PATH, "utf8");

// --- build variant B by inserting a specificity rule before the <rules> block
const SPECIFICITY_INSERT = `<specificity_rule>
For each focus point, write at least one question that makes a generic answer visibly hollow. "How's your energy?" lets the respondent say "fine" and move on. "What's different about this week compared to two weeks ago?" forces specificity — a contrast, a choice, or a concrete example. Prefer that framing for focus-point-driven questions. Ask for the shape of the story, not the headline.
</specificity_rule>

`;

function buildVariantB() {
  const marker = "<rules>";
  if (!ORIGINAL_PROMPT.includes(marker)) throw new Error("prompt is missing <rules> marker");
  return ORIGINAL_PROMPT.replace(marker, SPECIFICITY_INSERT + marker);
}

const VARIANT_B = buildVariantB();

async function runBank(label) {
  const tracker = cost.createTracker();
  cost.setActive(tracker);
  const bank = await generateBank(
    { focusPoints: FOCUS_POINTS, ...ctx, existingQueue: [] },
    {}
  );
  const cs = tracker.summary();
  return { label, bank, cost: cs };
}

let FOCUS_POINTS = null;

async function main() {
  // 1. Generate focus points ONCE (reused by both A and B bank runs)
  const tracker1 = cost.createTracker();
  cost.setActive(tracker1);
  const fp = await generateFocusPoints(ctx, {});
  FOCUS_POINTS = fp.focus_points;

  console.log("=== FOCUS POINTS (shared input for both bank runs) ===");
  for (const f of FOCUS_POINTS) console.log(`  ${f.id.padEnd(22)} ${f.label}`);
  console.log(`  (cost of stage 1: ${cost.formatUsd(tracker1.summary().usd_total)})`);
  console.log();

  // 2. Run A (current prompt)
  console.log("Running variant A (current prompt)...");
  const resultA = await runBank("A");

  // 3. Swap in variant B, run B, restore
  console.log("Running variant B (current + specificity rule)...");
  let resultB;
  try {
    fs.writeFileSync(PROMPT_PATH, VARIANT_B);
    resultB = await runBank("B");
  } finally {
    fs.writeFileSync(PROMPT_PATH, ORIGINAL_PROMPT);
  }

  // 4. Side-by-side output
  console.log();
  console.log("=== VARIANT A (current prompt) ===");
  for (const q of resultA.bank) {
    console.log(`  [${q.purpose}]  ${q.label}`);
    console.log(`    ${q.name}`);
  }
  console.log(`  (cost: ${cost.formatUsd(resultA.cost.usd_total)}, ${resultA.cost.total_tokens} tok)`);

  console.log();
  console.log("=== VARIANT B (+ specificity rule) ===");
  for (const q of resultB.bank) {
    console.log(`  [${q.purpose}]  ${q.label}`);
    console.log(`    ${q.name}`);
  }
  console.log(`  (cost: ${cost.formatUsd(resultB.cost.usd_total)}, ${resultB.cost.total_tokens} tok)`);

  console.log();
  console.log("=== SIDE-BY-SIDE (A vs B) ===");
  const maxLen = Math.max(resultA.bank.length, resultB.bank.length);
  for (let i = 0; i < maxLen; i++) {
    const a = resultA.bank[i];
    const b = resultB.bank[i];
    console.log(`  ${i + 1}.`);
    console.log(`    A: ${a ? a.name : "(none)"}`);
    console.log(`    B: ${b ? b.name : "(none)"}`);
    console.log();
  }

  // Save a record for future reference
  const outPath = path.join("logs", "probes", `probe-bank-ab-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        scenario: scenarioPath,
        focus_points: FOCUS_POINTS,
        variant_A: { bank: resultA.bank, cost: resultA.cost.usd_total, tokens: resultA.cost.total_tokens },
        variant_B: { bank: resultB.bank, cost: resultB.cost.usd_total, tokens: resultB.cost.total_tokens },
      },
      null,
      2
    )
  );
  console.log(`Record saved to ${outPath}`);
}

main().catch((e) => {
  // Best-effort restore of prompt if something threw
  try {
    fs.writeFileSync(PROMPT_PATH, ORIGINAL_PROMPT);
  } catch {}
  console.error("Error:", e.message);
  process.exit(1);
});
