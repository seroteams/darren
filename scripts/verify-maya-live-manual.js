#!/usr/bin/env node
// Maya QA live-manual verification (automated proxy).
// B1: simulate competency clarity stacking with recurring-gap damper → −5..−7.
// B3/B4: optional --live calls evaluate() on Maya persona transcript + axis_state.
//
//   node scripts/verify-maya-live-manual.js
//   node scripts/verify-maya-live-manual.js --live

const fs = require("node:fs");
const path = require("node:path");

const { loadEnv } = require("../src/env");
loadEnv();

const { initState, applyDeltas, serialize } = require("../src/axes");
const {
  applyRecurringGapClarityDamper,
  clampToSignature,
} = require("../src/queue-manager");
const { loadQuestion } = require("../src/questions");
const { evaluate } = require("../src/reviewer");

const { CONFIG_DIR } = require("../backend/engine/paths");
const BENCH = path.join(CONFIG_DIR, "persona-bench-v1.json");

const COERCIVE_RE =
  /\b(force\s|forcing\s|pin\s|pin\s+her|pin\s+him|drive\s+her|drive\s+him|make\s+her|make\s+him)\b/i;
const DEFINING_SIGNAL_RE = /\bdefining signal of this session\b/i;

function ok(label, cond) {
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`);
  return cond ? 0 : 1;
}

function questionForAlias(alias) {
  try {
    return loadQuestion(alias);
  } catch {
    return {
      alias,
      purpose: "topic",
      axis_effects: { clarity: 3 },
      name: alias,
    };
  }
}

function toSignature(axisEffects) {
  const sig = {};
  for (const [axis, mag] of Object.entries(axisEffects || {})) {
    sig[axis] = Math.abs(Number(mag) || 0);
  }
  return sig;
}

function simulateMayaClarityScore() {
  const persona = JSON.parse(fs.readFileSync(BENCH, "utf8")).personas.find(
    (p) => p.id === "maya-chen"
  );
  if (!persona) throw new Error("maya-chen not in persona-bench-v1.json");

  const state = initState();
  const transcript = [];

  for (const item of persona.script) {
    const q = questionForAlias(item.alias);
    const turn = {
      turn: transcript.length + 1,
      question: q,
      answer: item.answer,
    };
    transcript.push(turn);

    // Only competency gap turns book clarity negatives (Maya Jun03 pattern).
    if (q.purpose !== "competency") continue;
    if (!toSignature(q.axis_effects).clarity) continue;

    const rawDeltas = { clarity: -3 };
    const issues = [];
    applyRecurringGapClarityDamper(rawDeltas, {
      lastQuestion: q,
      transcript: transcript.slice(0, -1),
      issues,
    });
    const sig = toSignature(q.axis_effects);
    const { deltas } = clampToSignature(rawDeltas, sig);
    if (Object.keys(deltas).length) {
      applyDeltas(state, {
        questionAlias: q.alias,
        answerExcerpt: item.answer,
        deltas,
      });
      turn.realized_deltas = deltas;
    }
  }

  const clarity = state.clarity.score;
  return { clarity, state, transcript, persona };
}

function collectBriefingText(briefing) {
  const parts = [
    briefing?.headline,
    briefing?.understanding_paragraph,
    briefing?.brutal_truth_employee,
    briefing?.brutal_truth_manager,
    ...(briefing?.summary_bullets || []),
    ...(briefing?.watch_for || []),
    ...(briefing?.next_actions || []).map((a) => a?.action),
    ...(briefing?.axes || []).map((a) => a?.meaning),
  ];
  return parts.filter(Boolean).join("\n");
}

async function runLiveEval({ state, transcript, persona }) {
  if (!process.env.OPENAI_API_KEY) {
    console.log("\n  SKIP  --live eval (OPENAI_API_KEY not set)\n");
    return 0;
  }

  const ctx = {
    name: persona.name,
    role: persona.role,
    seniority: persona.seniority,
    meetingType: persona.meeting_type,
    notes: persona.notes,
  };
  const focusPoints = [
    {
      id: "quality",
      label: "Review readiness",
      reason: "Whether designs are ready before review rounds.",
    },
  ];

  console.log("\n─── Live eval (Maya persona + simulated axis_state) ───\n");
  const briefing = await evaluate({
    ctx,
    focusPoints,
    transcript,
    axisState: serialize(state),
    notes: persona.notes,
  });

  let failed = 0;
  const text = collectBriefingText(briefing);
  failed += ok("eval: no coercive force/pin/drive/make her-him in briefing", !COERCIVE_RE.test(text));

  const clarityAx = (briefing.axes || []).find((a) => a.id === "clarity");
  const clarityMeaning = clarityAx?.meaning || "";
  failed += ok(
    "eval: clarity meaning avoids 'defining signal of this session'",
    !DEFINING_SIGNAL_RE.test(clarityMeaning)
  );
  failed += ok(
    `eval: clarity score matches axis_state (${clarityAx?.score} === ${state.clarity.score})`,
    clarityAx?.score === state.clarity.score
  );

  if (failed) {
    console.log("\n  Briefing excerpt (clarity meaning):");
    console.log(`    ${clarityMeaning}\n`);
  }
  return failed;
}

async function main() {
  const live = process.argv.includes("--live");
  let failed = 0;

  console.log("\n─── Maya B1 clarity simulation (competency −3 stack + damper) ───\n");

  const { clarity, state, transcript, persona } = simulateMayaClarityScore();
  console.log(`  Simulated clarity score: ${clarity}`);
  failed += ok("B1: clarity in −5..−7 band", clarity >= -7 && clarity <= -5);
  failed += ok("B1: clarity not −10", clarity !== -10);

  const competencyTurns = transcript.filter((t) => t.question?.purpose === "competency");
  console.log(`  Competency turns in script: ${competencyTurns.length}`);

  if (live) {
    failed += await runLiveEval({ state, transcript, persona });
  } else {
    console.log(
      "\n  Tip: run with --live to call evaluate() and check B3/B4 copy (needs OPENAI_API_KEY).\n"
    );
  }

  if (failed) {
    console.error(`\n${failed} verify-maya-live-manual check(s) FAILED\n`);
    process.exit(1);
  }
  console.log("\n✓ verify-maya-live-manual passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
