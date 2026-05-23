#!/usr/bin/env node
//
// Probe for the planner prompt's thread-follow behaviour.
//
// Replays turn 4 of the Carl / Growth & career plan run
// (logs/2026_May14_22-38-37a3bfa9). The captured behaviour was: when Carl
// answered "head of department?" to the 18-month-vision question, the
// planner served q_role_expectations next — ignoring the thread.
//
// This probe calls planTurn() with the current (modified) prompt and prints
// the first item of the new_queue. Pass criterion: the first item names
// "head of department" verbatim and drills on the thread.
//
// Usage: node probe-plan-turn-ab.js [session-dir]

const fs = require("node:fs");
const path = require("node:path");

const { loadEnv } = require("./src/env");
const { initState, applyDeltas } = require("./src/axes");
const { planTurn } = require("./src/queue-manager");
const cost = require("./src/cost");

loadEnv();

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY not set.");
  process.exit(2);
}

const SESSION_DIR = process.argv[2] || path.join("logs", "2026_May14_22-38-37a3bfa9");

const session = JSON.parse(fs.readFileSync(path.join(SESSION_DIR, "session-state.json"), "utf8"));
const turn4 = JSON.parse(fs.readFileSync(path.join(SESSION_DIR, "04-dynamic-answers", "04-turn.json"), "utf8"));

const ctx = session.ctx;
const focusPoints = session.focusPointsResult.focus_points;

// Reconstruct transcript up to and including turn 4 (planner sees it as just-pushed)
const transcript = session.transcript.slice(0, 4).map((t) => ({
  turn: t.turn,
  question: t.question,
  answer: t.answer,
  skipped: t.skipped,
}));

// Reconstruct axisState as it was BEFORE turn 4's deltas were applied
// (apply turns 1-3 deltas only to a fresh state).
const axisState = initState();
for (const t of session.transcript.slice(0, 3)) {
  applyDeltas(axisState, {
    questionAlias: t.question.alias,
    answerExcerpt: t.answer,
    deltas: t.realized_deltas || {},
  });
}

const lastQuestion = { ...turn4.question, stage: turn4.question.stage || "aspiration" };
const lastAnswer = turn4.answer;

// The remaining queue going INTO turn 4's planner call isn't logged directly,
// but the OUT-of-turn-4 new_queue (which became the IN-of-turn-5 queue) is the
// best available proxy for what was in the bank at this point.
const remainingQueue = (turn4.new_queue || []).map((q) => ({
  alias: q.alias,
  label: q.label,
  name: q.name,
  description: q.description || "",
  purpose: q.purpose || "topic",
  stage: q.stage ?? null,
  axis_effects: q.axis_effects || {},
}));

async function main() {
  console.log("=== INPUT ===");
  console.log(`  ctx: ${ctx.name}, ${ctx.seniority} ${ctx.role}, ${ctx.meetingType}`);
  console.log(`  notes: ${ctx.notes}`);
  console.log();
  console.log("  transcript:");
  for (const t of transcript) {
    console.log(`    T${t.turn}  Q: ${t.question.name}`);
    console.log(`         A: ${t.answer}`);
  }
  console.log();
  console.log(`  last question (being scored): ${lastQuestion.name}`);
  console.log(`  last answer: "${lastAnswer}"`);
  console.log(`  remaining queue (${remainingQueue.length}): ${remainingQueue.map((q) => q.alias).join(", ")}`);
  console.log();

  const tracker = cost.createTracker();
  cost.setActive(tracker);
  const plan = await planTurn({
    focusPoints,
    ctx,
    transcript,
    lastQuestion,
    lastAnswer,
    axisState,
    remainingQueue,
    remainingBudget: 4,
    turnNumber: 4,
    totalTurns: 8,
  });
  const cs = tracker.summary();

  console.log("=== CAPTURED BEHAVIOUR (old prompt, what shipped) ===");
  const oldFirst = turn4.new_queue && turn4.new_queue[0];
  if (oldFirst) {
    console.log(`  [${oldFirst.alias}]`);
    console.log(`  ${oldFirst.name}`);
  } else {
    console.log("  (no captured next question)");
  }
  console.log();

  console.log("=== NEW BEHAVIOUR (current prompt, with arc + thread-follow) ===");
  const newFirst = plan.newQueue && plan.newQueue[0];
  if (newFirst) {
    console.log(`  [${newFirst.alias}]  ref=${newFirst.source}`);
    console.log(`  stage: ${newFirst.stage ?? "(null)"}`);
    console.log(`  ${newFirst.name}`);
  } else {
    console.log("  (planner returned empty queue)");
  }
  console.log();

  console.log("  assessment note:", plan.assessment.note);
  console.log("  realized deltas:", JSON.stringify(plan.assessment.deltas));
  if (plan.issues.length) {
    console.log("  issues:", plan.issues);
  }
  console.log();

  console.log("=== ASSERTION ===");
  const text = (newFirst?.name || "").toLowerCase();
  const namesIt = text.includes("head of department") || text.includes("head-of-department");
  if (namesIt) {
    console.log("  PASS — new_queue[0] names 'head of department' and drills on the thread.");
  } else {
    console.log("  FAIL — new_queue[0] does NOT name 'head of department'.");
    console.log("         The thread-follow rule did not fire as intended.");
  }
  console.log();

  console.log(`  (cost: ${cost.formatUsd(cs.usd_total)}, ${cs.total_tokens} tokens)`);

  // Save artefact
  const outPath = path.join(
    "logs",
    "probes",
    `probe-plan-turn-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        scenario: SESSION_DIR,
        input: { lastQuestion, lastAnswer, transcript_len: transcript.length },
        captured_first: oldFirst,
        new_first: newFirst,
        new_queue: plan.newQueue,
        assessment: plan.assessment,
        issues: plan.issues,
        cost: cs.usd_total,
      },
      null,
      2
    )
  );
  console.log(`  record: ${outPath}`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  console.error(e.stack);
  process.exit(1);
});
