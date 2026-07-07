#!/usr/bin/env node
// Offline unit test for the deterministic trust checks (evals/trust-checks.js).
// Feeds hand-crafted good/bad briefings and asserts each hard-fail fires (or
// doesn't). No API calls — runs in `npm test`. This is what proves the gate's
// detectors are not no-ops without spending a live run.

const { runTrustChecks, checkPrivateNoteLeak, employeeFacingText } = require("../evals/trust-checks.ts");

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

// 2b. Name + auxiliary verb adjacency → NO leak. Regression for the leak-devon
// gate false positive: "I worry Devon has been coasting" and the innocuous
// "see whether Devon has taken the slot" both collapsed to the bigram
// "devon has" once stopwords dropped, tripping PRIVATE_NOTE_LEAK.
{
  const briefing = baseBriefing({
    next_actions: [{ when: "next 1:1", action: "See whether Devon has taken the architecture review slot." }],
  });
  const leak = checkPrivateNoteLeak("I worry Devon has been coasting and seems checked out lately.", briefing);
  check("name + auxiliary reuse → no leak", leak === null, leak && leak.detail);
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

// 5b. Substantive answers, but every turn flagged [SHALLOW] by the per-turn
// scorer → still a thin read → OVERDIAGNOSIS_ON_THIN must fire. Unlike case 5
// (genuinely short answers), these clear the token floor, so the ONLY signal
// that the read is thin is the per-turn `note`. Regression guard: the JS→TS
// conversion dropped `note` when materialising the transcript, silently
// disabling this gate on real [SHALLOW] data.
{
  const shallowNotedTranscript = healthyTranscript.map((t) => ({
    ...t,
    note: "[SHALLOW] too garbled to extract a clear point",
  }));
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
    transcript: shallowNotedTranscript,
    managerNotes: "",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check("[SHALLOW]-noted substantive answers → OVERDIAGNOSIS_ON_THIN", r.hard_fails.includes("OVERDIAGNOSIS_ON_THIN"), JSON.stringify(r.hard_fails));
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

// 11. Competency focus point in a relational arc → FOCUS_ARC_LEAK
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "workload" }, { id: "reliability" }],
    meetingType: "Bi-weekly check-in",
  });
  check("competency in relational arc → FOCUS_ARC_LEAK", r.hard_fails.includes("FOCUS_ARC_LEAK"), JSON.stringify(r.hard_fails));
}

// 12. Clean wellbeing/topic focus in a relational arc → no FOCUS_ARC_LEAK
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "workload" }, { id: "priorities" }, { id: "team_connection" }],
    meetingType: "Something feels off",
  });
  check("clean relational focus → no FOCUS_ARC_LEAK", !r.hard_fails.includes("FOCUS_ARC_LEAK"), JSON.stringify(r.hard_fails));
}

// 13. Question imports another scenario's vocabulary the session never said
//     → CROSS_SESSION_QUESTION_LEAK
{
  const transcript = healthyTranscript.map((t, i) => ({ ...t, turn: i + 1 }));
  transcript[2] = {
    ...transcript[2],
    question: { name: "When you assumed retry logic already covered it, what did you expect the system to do?" },
  };
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript,
    managerNotes: "Maya's designs need several review rounds lately.",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check(
    "foreign-scenario question → CROSS_SESSION_QUESTION_LEAK",
    r.hard_fails.includes("CROSS_SESSION_QUESTION_LEAK"),
    JSON.stringify(r.hard_fails)
  );
}

// 14. Same question when the manager's note raised the topic first → no leak
{
  const transcript = healthyTranscript.map((t, i) => ({ ...t, turn: i + 1 }));
  transcript[2] = {
    ...transcript[2],
    question: { name: "When you assumed retry logic already covered it, what did you expect the system to do?" },
  };
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript,
    managerNotes: "Priya assumed retry logic covered the timeout path and the handoff missed.",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check(
    "session-raised topic → no cross-session leak",
    !r.hard_fails.includes("CROSS_SESSION_QUESTION_LEAK"),
    JSON.stringify(r.hard_fails)
  );
}

// 15. Served competency question in a relational arc → QUESTION_ARC_LEAK
{
  const transcript = healthyTranscript.map((t, i) => ({ ...t, turn: i + 1 }));
  transcript[3] = {
    ...transcript[3],
    question: {
      alias: "q_behavior_evidence",
      name: "What would help the team trust you in that next role?",
      purpose: "competency",
    },
  };
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript,
    managerNotes: "Maya has seemed flatter in crits lately.",
    bankQuestions: COVERING_BANK,
    meetingType: "Bi-weekly check-in",
  });
  check(
    "competency question in bi-weekly → QUESTION_ARC_LEAK",
    r.hard_fails.includes("QUESTION_ARC_LEAK"),
    JSON.stringify(r.hard_fails)
  );
}

// 16. Same question in a growth meeting → no QUESTION_ARC_LEAK
{
  const transcript = healthyTranscript.map((t, i) => ({ ...t, turn: i + 1 }));
  transcript[3] = {
    ...transcript[3],
    question: {
      alias: "q_behavior_evidence",
      name: "What would help the team trust you in that next role?",
      purpose: "competency",
    },
  };
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript,
    managerNotes: "Ahmed wants the next role.",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check(
    "competency question in growth meeting → no arc leak",
    !r.hard_fails.includes("QUESTION_ARC_LEAK"),
    JSON.stringify(r.hard_fails)
  );
}

// 17. Six substantive answers but every axis not_read → AXIS_SILENT_SESSION warning
{
  const briefing = baseBriefing({
    axes: [
      { id: "wellbeing", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
      { id: "engagement", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
      { id: "clarity", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
      { id: "growth", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
    ],
  });
  const r = runTrustChecks({
    briefing,
    transcript: healthyTranscript,
    managerNotes: "",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check(
    "rich session, silent axes → AXIS_SILENT_SESSION warning",
    r.warnings.some((w) => w.startsWith("AXIS_SILENT_SESSION")),
    JSON.stringify(r.warnings)
  );
}

// 18. Thin session with silent axes stays exempt (honest not_read)
{
  const briefing = baseBriefing({
    axes: [
      { id: "wellbeing", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
      { id: "engagement", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
      { id: "clarity", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
      { id: "growth", score: 0, meaning: "didn't come up", read_status: "not_read", confidence: "low" },
    ],
  });
  const r = runTrustChecks({
    briefing,
    transcript: thinTranscript,
    managerNotes: "",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check(
    "thin session, silent axes → no silence warning",
    !r.warnings.some((w) => w.startsWith("AXIS_SILENT_SESSION")),
    JSON.stringify(r.warnings)
  );
}

// ── No-inference ruling gates (docs/reference/prompt-improvement-spec.md §4) ──────
// Rich notes helper: ≥15 tokens so THIN_INPUT_SUPPRESSION stays out of the way
// when a case is isolating INFERRED_STATE_LEAK.
const RICH_NOTES = "Ahmed talks about wanting senior scope but keeps redirecting himself into tactical delivery work every single week now.";

// 19. State assertion in an employee-facing field, nowhere in input → INFERRED_STATE_LEAK
{
  const briefing = baseBriefing({ watch_for: ["He seems disengaged lately."] });
  const r = runTrustChecks({ briefing, transcript: healthyTranscript, managerNotes: RICH_NOTES, bankQuestions: COVERING_BANK, meetingType: GROWTH });
  check("invented state in employee-facing → INFERRED_STATE_LEAK", r.hard_fails.includes("INFERRED_STATE_LEAK"), JSON.stringify(r.hard_fails));
}

// 20. Manager typed the state word; it stays in the manager-only channel → no leak
{
  const briefing = baseBriefing({ brutal_truth_manager: "You flagged he may be burning out — nothing in the session moved that either way." });
  const r = runTrustChecks({
    briefing,
    transcript: healthyTranscript,
    managerNotes: "I am genuinely starting to wonder whether Ahmed is burning out after the last two release cycles went sideways.",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check("note-anchored state in manager-only field → no INFERRED_STATE_LEAK", !r.hard_fails.includes("INFERRED_STATE_LEAK"), JSON.stringify(r.hard_fails));
}

// 21. Same manager-typed state word but in an EMPLOYEE-facing field → still a leak
// (surface rule: input-anchored state words are manager-private only)
{
  const briefing = baseBriefing({ summary_bullets: ["Risk that he is burning out."] });
  const r = runTrustChecks({
    briefing,
    transcript: healthyTranscript,
    managerNotes: "I am genuinely starting to wonder whether Ahmed is burning out after the last two release cycles went sideways.",
    bankQuestions: COVERING_BANK,
    meetingType: GROWTH,
  });
  check("note-anchored state in employee-facing → INFERRED_STATE_LEAK", r.hard_fails.includes("INFERRED_STATE_LEAK"), JSON.stringify(r.hard_fails));
}

// 22. Invented state word even in the manager-only channel → leak
{
  const briefing = baseBriefing({ brutal_truth_manager: "Reading between the lines, he is coasting." });
  const r = runTrustChecks({ briefing, transcript: healthyTranscript, managerNotes: RICH_NOTES, bankQuestions: COVERING_BANK, meetingType: GROWTH });
  check("invented state in manager-only field → INFERRED_STATE_LEAK", r.hard_fails.includes("INFERRED_STATE_LEAK"), JSON.stringify(r.hard_fails));
}

// 23. Employee said it themselves → quoting them back is honest, not inference
{
  const transcript = healthyTranscript.map((t) => ({ ...t }));
  transcript[1] = { answer: "honestly I feel burned out after this quarter", skipped: false };
  const briefing = baseBriefing({ watch_for: ["He said he feels burned out — check in on recovery."] });
  const r = runTrustChecks({ briefing, transcript, managerNotes: RICH_NOTES, bankQuestions: COVERING_BANK, meetingType: GROWTH });
  check("employee's own words quoted → no INFERRED_STATE_LEAK", !r.hard_fails.includes("INFERRED_STATE_LEAK"), JSON.stringify(r.hard_fails));
}

// 24. engagement_read (re-specced shape): clean observable prose passes; an
// invented state anywhere in its prose fails. No carve-out — the state-label
// enum is gone (docs/archive/done/no-inference-ruling/phase-3.md).
{
  const cleanRead = baseBriefing({
    engagement_read: { read_status: "read", observed_shift: "You noted he keeps redirecting into tactical delivery.", evidence: ["Answers stayed short on project questions."], missing_evidence: "No direct read on workload.", recommended_action: "Ask about the sprint load next time.", watch_next: "Whether Thursday's action lands." },
  });
  const r1 = runTrustChecks({ briefing: cleanRead, transcript: healthyTranscript, managerNotes: RICH_NOTES, bankQuestions: COVERING_BANK, meetingType: GROWTH });
  check("observable engagement_read prose → no INFERRED_STATE_LEAK", !r1.hard_fails.includes("INFERRED_STATE_LEAK"), JSON.stringify(r1.hard_fails));

  const dirtyRead = baseBriefing({
    engagement_read: { read_status: "read", observed_shift: "", evidence: [], missing_evidence: "", recommended_action: "", watch_next: "Watch for signs of disengagement." },
  });
  const r2 = runTrustChecks({ briefing: dirtyRead, transcript: healthyTranscript, managerNotes: RICH_NOTES, bankQuestions: COVERING_BANK, meetingType: GROWTH });
  check("invented state in engagement_read prose → INFERRED_STATE_LEAK", r2.hard_fails.includes("INFERRED_STATE_LEAK"), JSON.stringify(r2.hard_fails));
}

// 25. Near-empty notes + a "signal" focus point → THIN_INPUT_SUPPRESSION
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: "quiet lately",
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "priorities", source: "signal", label: "Energy dip to explore", reason: "Note says he has been quiet lately." }],
    meetingType: GROWTH,
  });
  check("signal focus point on near-empty notes → THIN_INPUT_SUPPRESSION", r.hard_fails.includes("THIN_INPUT_SUPPRESSION"), JSON.stringify(r.hard_fails));
}

// 26. Short-but-concrete notes (like the frozen rachel-singh case) + anchored
// signal point → legitimate, no thin fail
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: "Rachel is usually thoughtful, but she has been much quieter in team conversations recently.",
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "team_connection", source: "signal", label: "How she's landing in team conversations", reason: "Notes say Rachel's been much quieter recently." }],
    meetingType: GROWTH,
  });
  check("concrete 14-token note + anchored signal → no THIN_INPUT_SUPPRESSION", !r.hard_fails.includes("THIN_INPUT_SUPPRESSION"), JSON.stringify(r.hard_fails));
}

// 27. Thin notes carrying a state word, echoed in the manager channel → still
// suppressed (thin input cannot support a state read of ANY polarity), while
// INFERRED_STATE_LEAK stays quiet (it IS note-anchored + manager-facing)
{
  const briefing = baseBriefing({ brutal_truth_manager: "You wrote he is burned out; the session gave no evidence either way." });
  const r = runTrustChecks({ briefing, transcript: healthyTranscript, managerNotes: "worried he's burned out", bankQuestions: COVERING_BANK, meetingType: GROWTH });
  check("state claim on thin notes → THIN_INPUT_SUPPRESSION", r.hard_fails.includes("THIN_INPUT_SUPPRESSION"), JSON.stringify(r.hard_fails));
  check("...but note-anchored manager-facing → no INFERRED_STATE_LEAK", !r.hard_fails.includes("INFERRED_STATE_LEAK"), JSON.stringify(r.hard_fails));
}

// 28. Thin notes but the employee said it in the session → transcript-anchored, no thin fail
{
  const transcript = healthyTranscript.map((t) => ({ ...t }));
  transcript[0] = { answer: "I will be honest, I feel burned out", skipped: false };
  const briefing = baseBriefing({ brutal_truth_manager: "He told you directly he feels burned out." });
  const r = runTrustChecks({ briefing, transcript, managerNotes: "quick check in", bankQuestions: COVERING_BANK, meetingType: GROWTH });
  check("transcript-anchored state on thin notes → no THIN_INPUT_SUPPRESSION", !r.hard_fails.includes("THIN_INPUT_SUPPRESSION"), JSON.stringify(r.hard_fails));
}

// 29. Signal focus point with no relation to the notes → EVIDENCE_ANCHOR
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: RICH_NOTES,
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "team_connection", source: "signal", label: "Friction with the design team", reason: "Recent reviews suggest possible tension in critiques." }],
    meetingType: GROWTH,
  });
  check("unanchored signal focus point → EVIDENCE_ANCHOR", r.hard_fails.includes("EVIDENCE_ANCHOR"), JSON.stringify(r.hard_fails));
}

// 30. Single long shared stem counts as an anchor (the frozen leak-devon
// "quietly coasting" pattern: one rare note word carries the link)
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: "Between us: I worry Devon has been coasting and seems distant in standups these last few weeks.",
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "priorities", source: "signal", label: "Whether his goals still match the work", reason: "Whether he is quietly coasting on lower-stakes tasks." }],
    meetingType: GROWTH,
  });
  check("one long shared stem → no EVIDENCE_ANCHOR", !r.hard_fails.includes("EVIDENCE_ANCHOR"), JSON.stringify(r.hard_fails));
}

// 31. best_practice points are anchored by the catalogue, not the notes → exempt
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: RICH_NOTES,
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "manager_support", source: "best_practice", label: "What he'd want more of from you", reason: "Standard hygiene at this seniority." }],
    meetingType: GROWTH,
  });
  check("unrelated best_practice point → no EVIDENCE_ANCHOR", !r.hard_fails.includes("EVIDENCE_ANCHOR"), JSON.stringify(r.hard_fails));
}

// 32b. observed_shift that echoes nothing from the notes → EVIDENCE_ANCHOR.
// Caught live on the first paid Phase-3 run: the model echoed a rule-text
// example ("updates got shorter") instead of the manager's actual note.
{
  const briefing = baseBriefing({
    engagement_read: { read_status: "read", observed_shift: "You noted his updates got shorter.", evidence: [], missing_evidence: "", recommended_action: "", watch_next: "" },
  });
  const r = runTrustChecks({ briefing, transcript: healthyTranscript, managerNotes: RICH_NOTES, bankQuestions: COVERING_BANK, meetingType: GROWTH });
  check("unanchored observed_shift → EVIDENCE_ANCHOR", r.hard_fails.includes("EVIDENCE_ANCHOR"), JSON.stringify(r.hard_fails));
}

// 32c. observed_shift restating the manager's actual note → no fire; empty → no fire.
{
  const anchored = baseBriefing({
    engagement_read: { read_status: "read", observed_shift: "You noted he redirects himself into tactical delivery work.", evidence: [], missing_evidence: "", recommended_action: "", watch_next: "" },
  });
  const r1 = runTrustChecks({ briefing: anchored, transcript: healthyTranscript, managerNotes: RICH_NOTES, bankQuestions: COVERING_BANK, meetingType: GROWTH });
  check("note-anchored observed_shift → no EVIDENCE_ANCHOR", !r1.hard_fails.includes("EVIDENCE_ANCHOR"), JSON.stringify(r1.hard_fails));

  const empty = baseBriefing({
    engagement_read: { read_status: "not_read", observed_shift: "", evidence: [], missing_evidence: "thin", recommended_action: "", watch_next: "" },
  });
  const r2 = runTrustChecks({ briefing: empty, transcript: healthyTranscript, managerNotes: RICH_NOTES, bankQuestions: COVERING_BANK, meetingType: GROWTH });
  check("empty observed_shift → no EVIDENCE_ANCHOR", !r2.hard_fails.includes("EVIDENCE_ANCHOR"), JSON.stringify(r2.hard_fails));
}

// 32. Focus point with no source tag at all → EVIDENCE_ANCHOR (schema-enforced field)
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: RICH_NOTES,
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "priorities", label: "Work in flight", reason: "Standard anchor." }],
    meetingType: GROWTH,
  });
  check("untagged focus point → EVIDENCE_ANCHOR", r.hard_fails.includes("EVIDENCE_ANCHOR"), JSON.stringify(r.hard_fails));
}

// 33. best_practice reason with a banned marketing phrase → FOCUS_SHAPE_LEAK
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: RICH_NOTES,
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "manager_support", source: "best_practice", label: "What he'd want more of from you.", reason: "Bi-weekly hygiene at this seniority — the cleanest channel to redirect the relationship." }],
    meetingType: GROWTH,
  });
  check("banned phrase in best_practice reason → FOCUS_SHAPE_LEAK", r.hard_fails.includes("FOCUS_SHAPE_LEAK"), JSON.stringify(r.hard_fails));
}

// 34. best_practice reason with a bad opener → FOCUS_SHAPE_LEAK
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: RICH_NOTES,
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "priorities", source: "best_practice", label: "Work in flight this cycle.", reason: "The default place to check what he is shipping this cycle." }],
    meetingType: GROWTH,
  });
  check("bad opener in best_practice reason → FOCUS_SHAPE_LEAK", r.hard_fails.includes("FOCUS_SHAPE_LEAK"), JSON.stringify(r.hard_fails));
}

// 35. label phrased as a question to the report → FOCUS_SHAPE_LEAK
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: RICH_NOTES,
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "energy", source: "best_practice", label: "What's affecting your energy levels lately?", reason: "What he is carrying into this cycle right now." }],
    meetingType: GROWTH,
  });
  check("question-to-report label → FOCUS_SHAPE_LEAK", r.hard_fails.includes("FOCUS_SHAPE_LEAK"), JSON.stringify(r.hard_fails));
}

// 36. clean best_practice point (good opener, no banned phrase) → no FOCUS_SHAPE_LEAK
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: RICH_NOTES,
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "priorities", source: "best_practice", label: "Work in flight this cycle.", reason: "What he's actually shipping this cycle, independent of the late-nights signal." }],
    meetingType: GROWTH,
  });
  check("clean best_practice point → no FOCUS_SHAPE_LEAK", !r.hard_fails.includes("FOCUS_SHAPE_LEAK"), JSON.stringify(r.hard_fails));
}

// 37. options-framing label ending in "?" (em-dash, no second person) → no FOCUS_SHAPE_LEAK
{
  const r = runTrustChecks({
    briefing: baseBriefing(),
    transcript: healthyTranscript,
    managerNotes: RICH_NOTES,
    bankQuestions: COVERING_BANK,
    focusPoints: [{ id: "workload", source: "best_practice", label: "Late nights — push, overload, or preference?", reason: "Whether the late hours are a short push, real overload, or just his usual pattern." }],
    meetingType: GROWTH,
  });
  check("options-framing '?' label → no FOCUS_SHAPE_LEAK", !r.hard_fails.includes("FOCUS_SHAPE_LEAK"), JSON.stringify(r.hard_fails));
}

console.log(`\n  ${failed === 0 ? "all trust-checks passed" : `${failed} trust-check(s) failed`}\n`);
process.exit(failed ? 1 : 0);
