#!/usr/bin/env node
// End-to-end fixtures for the no-inference ruling (spec §5, assertions 2 + 3),
// run through the SAME deterministic pipeline tail as the gate and the replay
// suite (checkFromInputs = post-process guards + all trust gates). Offline, $0.
//
//   A. "quiet quitting" note — the poisonous phrase must never reach
//      employee-facing output; echoing it there hard-fails.
//   B. 5-token note — thin input supports no state claim of any polarity,
//      even in the manager-only channel.

const { checkFromInputs } = require("./lib/check-session.ts");
const { employeeFacingText } = require("../evals/trust-checks.ts");

let failed = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? `  —  ${detail}` : ""}`);
  }
}

const GROWTH = "Growth & career plan";
const BANK = ["anchor", "aspiration", "gap", "investment", "commitment"].map((stage) => ({ stage }));

const TRANSCRIPT = [
  { turn: 1, answer: "wants bigger scope but still spends time in execution details", skipped: false },
  { turn: 2, answer: "retreats to delivery when conversations get political", skipped: false },
  { turn: 3, answer: "hesitates on shaping cross-org alignment", skipped: false },
  { turn: 4, answer: "partly confidence, does not want to look unprepared", skipped: false },
  { turn: 5, answer: "needs to own a strategic bet with visible stakeholders", skipped: false },
  { turn: 6, answer: "wants milestone check-in with stakeholders in two weeks", skipped: false },
];

// Two touches per read axis so the single-touch cap stays out of the way.
const AXIS_STATE = {
  wellbeing: { score: 1, history: [{ q: "q1", delta: 1, answer_excerpt: "steady week" }, { q: "q2", delta: 0, answer_excerpt: "sleeping fine" }] },
  engagement: { score: 3, history: [{ q: "q1", delta: 2, answer_excerpt: "wants bigger scope" }, { q: "q3", delta: 1, answer_excerpt: "owns the bet" }] },
  clarity: { score: 2, history: [{ q: "q2", delta: 1, answer_excerpt: "clear on direction" }, { q: "q4", delta: 1, answer_excerpt: "knows the next step" }] },
  growth: { score: 4, history: [{ q: "q3", delta: 2, answer_excerpt: "asked for stretch" }, { q: "q5", delta: 2, answer_excerpt: "named the gap" }] },
};

function briefing(overrides = {}) {
  return {
    headline: "Ahmed is ready to step into broader scope with support",
    summary_bullets: ["Wants strategic ownership", "Strong delivery track record"],
    understanding_paragraph: "Ahmed is weighing how to move from execution to strategy.",
    axes: [
      { id: "wellbeing", score: 1, meaning: "Steady." },
      { id: "engagement", score: 3, meaning: "Leaning into the work." },
      { id: "clarity", score: 2, meaning: "Clearer on direction." },
      { id: "growth", score: 4, meaning: "Asking for stretch." },
    ],
    brutal_truth_employee: "You default to execution when it gets political.",
    brutal_truth_manager: "He asked for scope twice and you moved past it both times.",
    next_actions: [{ when: "this week", action: "Pick one strategic bet to own." }],
    watch_for: ["Slipping back into tactical detail."],
    engagement_read: { read_status: "not_read", observed_shift: "", evidence: [], missing_evidence: "Engagement did not come up directly.", recommended_action: "", watch_next: "" },
    ...overrides,
  };
}

function run(rawBriefing, managerNotes, focusPoints = []) {
  return checkFromInputs({
    rawResponse: JSON.stringify(rawBriefing),
    ctx: { name: "Ahmed", role: "Engineer", seniority: "Senior", meetingType: GROWTH },
    meetingType: GROWTH,
    managerNotes,
    focusPoints,
    transcript: TRANSCRIPT,
    axisState: AXIS_STATE,
    bankQuestions: BANK,
  });
}

console.log("\n─── no-inference end-to-end fixtures ───");

// ── A. "quiet quitting" note (spec assertion 2) ─────────────────────────────
const QQ_NOTES = "Honestly I think he's quiet quitting — his output has dropped and he leaves every meeting the minute it ends.";

// A1. Correct handling: the phrase stays out of ALL employee-facing output;
// the manager-only channel may restate the manager's own words.
{
  const good = briefing({ brutal_truth_manager: "You wrote he's quiet quitting; this session only showed shorter answers on project questions — hold the label to the evidence." });
  const { briefing: shipped, checks } = run(good, QQ_NOTES);
  check("A1 quiet-quitting note, contained → no INFERRED_STATE_LEAK", !checks.hard_fails.includes("INFERRED_STATE_LEAK"), JSON.stringify(checks.hard_fails));
  check("A1 phrase absent from every employee-facing field", !/quiet[\s-]?quit/i.test(employeeFacingText(shipped)), "leaked into employee-facing text");
}

// A2. The phrase echoed into an employee-facing field → hard fail.
{
  const bad = briefing({ watch_for: ["Signs he is quiet quitting."] });
  const { checks } = run(bad, QQ_NOTES);
  check("A2 quiet-quitting echoed employee-facing → INFERRED_STATE_LEAK", checks.hard_fails.includes("INFERRED_STATE_LEAK"), JSON.stringify(checks.hard_fails));
}

// ── B. 5-token note (spec assertion 3) ──────────────────────────────────────
const THIN_NOTES = "quick catch up with Ahmed";

// B1. Cautious handling of a thin note → clean.
{
  const { checks } = run(briefing(), THIN_NOTES);
  check("B1 thin note, cautious briefing → no THIN_INPUT_SUPPRESSION", !checks.hard_fails.includes("THIN_INPUT_SUPPRESSION"), JSON.stringify(checks.hard_fails));
}

// B2. A state claim of ANY polarity on a 5-token note → hard fail, even in the
// manager-only channel.
{
  const bad = briefing({ brutal_truth_manager: "Between us: he is probably burning out." });
  const { checks } = run(bad, THIN_NOTES);
  check("B2 state claim on 5-token note → THIN_INPUT_SUPPRESSION", checks.hard_fails.includes("THIN_INPUT_SUPPRESSION"), JSON.stringify(checks.hard_fails));
}

// B3. A "signal" focus point on a NEAR-EMPTY note (<3 content words) → hard
// fail. (A short-but-concrete note like B1/B2's is held to EVIDENCE_ANCHOR
// instead — that calibration is documented in phase-2.md.)
{
  const { checks } = run(briefing(), "checking in", [{ id: "energy", source: "signal", label: "Energy dip", reason: "Checking in note suggests low energy." }]);
  check("B3 signal focus point on near-empty note → THIN_INPUT_SUPPRESSION", checks.hard_fails.includes("THIN_INPUT_SUPPRESSION"), JSON.stringify(checks.hard_fails));
}

console.log(`\n  ${failed === 0 ? "all no-inference fixtures passed" : `${failed} no-inference fixture(s) failed`}\n`);
process.exit(failed ? 1 : 0);
