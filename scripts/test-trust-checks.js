#!/usr/bin/env node
// Offline unit test for the deterministic trust checks (evals/trust-checks.js).
// Feeds hand-crafted good/bad briefings and asserts each hard-fail fires (or
// doesn't). No API calls — runs in `npm test`. This is what proves the gate's
// detectors are not no-ops without spending a live run.

const { runTrustChecks, checkPrivateNoteLeak, employeeFacingText } = require("../evals/trust-checks");

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
const COVERING_BANK = ["anchor", "aspiration", "gap", "investment", "commitment"].map((stage) => ({ stage }));

const healthyTranscript = [
  { answer: "wants bigger scope but still spends time in execution details", skipped: false },
  { answer: "retreats to delivery when conversations get political", skipped: false },
  { answer: "hesitates on shaping cross-org alignment", skipped: false },
  { answer: "partly confidence, does not want to look unprepared", skipped: false },
  { answer: "needs to own a strategic bet with visible stakeholders", skipped: false },
  { answer: "wants milestone check-in with stakeholders in two weeks", skipped: false },
];

const thinTranscript = [
  { answer: "fine", skipped: false },
  { answer: "(skipped)", skipped: true },
  { answer: "ok", skipped: false },
  { answer: "nothing to add", skipped: false },
  { answer: "", skipped: true },
  { answer: "not sure", skipped: false },
];

function baseBriefing(overrides = {}) {
  return {
    headline: "Ahmed is ready to step into broader scope with support",
    summary_bullets: ["Wants strategic ownership", "Strong delivery track record"],
    understanding_paragraph: "Ahmed is weighing how to move from execution to strategy.",
    axes: [
      { id: "wellbeing", score: 1, meaning: "Steady.", read_status: "read", confidence: "medium" },
      { id: "engagement", score: 3, meaning: "Engaged in the work.", read_status: "read", confidence: "medium" },
      { id: "clarity", score: 2, meaning: "Clearer on direction.", read_status: "read", confidence: "medium" },
      { id: "growth", score: 4, meaning: "Growth-oriented.", read_status: "read", confidence: "medium" },
    ],
    brutal_truth_employee: "You default to execution when it gets political.",
    brutal_truth_manager: "He privately doubts he is ready to lead and his communication is weak.",
    next_actions: [{ when: "this week", action: "Pick one strategic bet to own." }],
    watch_for: ["Slipping back into tactical detail."],
    ...overrides,
  };
}

console.log("\n─── trust-checks unit ───");

// 1. Clean briefing on a healthy read → PASS
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: "Ahmed talks about senior scope but redirects into tactical delivery.",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check("clean briefing → PASS", r.verdict === "PASS", `got ${r.verdict} ${JSON.stringify(r.hard_fails)}`);
}

// 2. Private worry reused verbatim in an employee-facing field → PRIVATE_NOTE_LEAK
{
  const briefing = baseBriefing({
    understanding_paragraph: "The read is that he is not ready to lead just yet.",
  });
  const r = runTrustChecks({
    briefing,
    transcript: healthyTranscript,
    managerNotes: "I doubt he is ready to lead and his communication is weak.",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check("private worry leak → PRIVATE_NOTE_LEAK", r.hard_fails.includes("PRIVATE_NOTE_LEAK"), JSON.stringify(r.hard_fails));
}

// 3. Same worry phrase only in brutal_truth_manager (the private channel) → NO leak
{
  const briefing = baseBriefing({
    brutal_truth_manager: "Privately: he is not ready to lead and communication is weak.",
  });
  const leak = checkPrivateNoteLeak("I doubt he is not ready to lead.", briefing);
  check("worry in manager-only field → no leak", leak === null, leak && leak.detail);
}

// 4. Neutral observation reused in output → NO leak (no judgment marker)
{
  const briefing = baseBriefing({
    summary_bullets: ["He just joined the payments team this quarter."],
  });
  const r = runTrustChecks({
    briefing,
    transcript: healthyTranscript,
    managerNotes: "He just joined the payments team this quarter.",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check("neutral observation reuse → no leak", !r.hard_fails.includes("PRIVATE_NOTE_LEAK"), JSON.stringify(r.hard_fails));
}

// 5. Thin read + confident high axis → OVERDIAGNOSIS_ON_THIN
{
  const briefing = baseBriefing({
    axes: [
      { id: "wellbeing", score: 1, meaning: "ok", read_status: "read", confidence: "medium" },
      { id: "engagement", score: -7, meaning: "Disengaged.", read_status: "read", confidence: "high" },
      { id: "clarity", score: 0, meaning: "n/a", read_status: "not_read", confidence: "low" },
      { id: "growth", score: 0, meaning: "n/a", read_status: "not_read", confidence: "low" },
    ],
  });
  const r = runTrustChecks({
    briefing,
    transcript: thinTranscript,
    managerNotes: "",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check("thin read + confident axis → OVERDIAGNOSIS_ON_THIN", r.hard_fails.includes("OVERDIAGNOSIS_ON_THIN"), JSON.stringify(r.hard_fails));
}

// 6. Thin read but properly softened (not_read) axes → no over-diagnosis
{
  const briefing = baseBriefing({
    axes: [
      { id: "wellbeing", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
      { id: "engagement", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
      { id: "clarity", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
      { id: "growth", score: 1, meaning: "faint signal", read_status: "read", confidence: "low" },
    ],
  });
  const r = runTrustChecks({
    briefing,
    transcript: thinTranscript,
    managerNotes: "",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check("thin read + softened axes → no over-diagnosis", !r.hard_fails.includes("OVERDIAGNOSIS_ON_THIN"), JSON.stringify(r.hard_fails));
}

// 7. Missing required key → SCHEMA_INVALID
{
  const briefing = baseBriefing();
  delete briefing.brutal_truth_employee;
  const r = runTrustChecks({ briefing, transcript: healthyTranscript, meetingType: GROWTH, bankQuestions: COVERING_BANK });
  check("missing key → SCHEMA_INVALID", r.hard_fails.includes("SCHEMA_INVALID"), JSON.stringify(r.hard_fails));
}

// 8. Engine vocabulary in employee-facing output → ENGINE_VOCAB_LEAK
{
  const briefing = baseBriefing({ headline: "Planner flagged a bad follow-up in the session." });
  const r = runTrustChecks({ briefing, transcript: healthyTranscript, meetingType: GROWTH, bankQuestions: COVERING_BANK });
  check("engine vocab in briefing → ENGINE_VOCAB_LEAK", r.hard_fails.includes("ENGINE_VOCAB_LEAK"), JSON.stringify(r.hard_fails));
}

// 9. Meeting type with no matching arc coverage → WRONG_MEETING_TYPE
{
  const r = runTrustChecks({ briefing: baseBriefing(), transcript: healthyTranscript, meetingType: GROWTH, bankQuestions: [{ stage: "nonsense" }] });
  check("uncovered arc → WRONG_MEETING_TYPE", r.hard_fails.includes("WRONG_MEETING_TYPE"), JSON.stringify(r.hard_fails));
}

// 10. employeeFacingText excludes the manager-only channel
{
  const text = employeeFacingText(baseBriefing());
  check("employeeFacingText excludes brutal_truth_manager", !text.includes("privately doubts"), text.slice(0, 80));
}

console.log(`\n  ${failed === 0 ? "all trust-checks passed" : `${failed} trust-check(s) failed`}\n`);
process.exit(failed ? 1 : 0);
