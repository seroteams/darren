import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeReview, reviewStatusFromMarks, libraryBadge } from "./review-serialize.js";

// "Copy all" is the Run Review's export — the text a human or an AI reviewer
// judges the engine on. It must carry EVERY input the run had (agenda, cached
// role context, last time's actions, focus points, the coach hints and planner
// reads on each turn, the full recap, the actions agreed), and must stay silent
// about inputs a run never had.

const FULL_RUN = {
  id: "2026_Aug01_18-00-abc",
  mode: "manual",
  runLabel: "regression:biweekly-priya",
  fingerprint: { promptVersion: "7929fd12", modelConfigVersion: "0eda6ff3" },
  cost: { usd: 0.1139175, calls: 6 },
  ctx: { name: "Priya", role: "Senior Backend Engineer", seniority: "Senior", meetingType: "Bi-weekly check-in", notes: "Quieter since the launch." },
  agenda: { raw: "next quarter ownership", summary: "Wants her next-quarter area settled", injected: true, covered: false },
  roleProfile: { key: "senior-backend-engineer--senior", status: "cached", summary: "Builds services.", listenFor: ["Tradeoffs"], avoid: ["Feature-factory framing"], challenges: 4 },
  priorActions: { fromSessionId: "run_a", skipped: false, outcomes: [{ owner: "manager", action: "Send the scope note", outcome: "partly" }] },
  focusPoints: [{ id: "priorities", type: "Priorities & goals", category: "topic", label: "What she'll own next quarter", reason: "Her post-launch focus is unsettled.", source: "signal", confidence: "medium" }],
  prep: { coreIssue: "Between a pause and her next bet.", openingQuestion: "How has this week felt?" },
  turns: [
    {
      name: "How has this week felt?",
      description: "Gives her the frame.",
      purpose: "wellbeing",
      stage: "pulse",
      source: "generated",
      hints: [{ kind: "ask", text: "Keep it calm." }, { kind: "listen", text: "Whether she names recovery." }],
      answer: "Mostly cleanup.",
      skipped: false,
      read: "note",
      note: "Mild flatness signal.",
    },
  ],
  briefing: {
    headline: "She doesn't know what she'll own next quarter.",
    summary_bullets: ["Uncertainty, not a launch comedown."],
    understanding_paragraph: "The quieter week is not the story.",
    brutal_truth_employee: "She has stopped pushing on mentoring.",
    brutal_truth_manager: "You left the thread open for months.",
    next_actions: [{ when: "today", action: "Name two ownership options." }],
    watch_for: ["Whether she raises mentoring unprompted."],
    axes: [{ id: "clarity", score: -2, meaning: "Unsure of her next area", read_status: "read" }],
    engagement_read: { read_status: "read", observed_shift: "Quieter this week", evidence: ["\"stopped pushing\""], missing_evidence: "", recommended_action: "Name the options.", watch_next: "Whether she picks one." },
  },
  promises: [{ id: "p1", owner: "manager", action: "Send two options", when: "today", outcome: null }],
};

test("serializeReview: carries every input the run had", () => {
  const text = serializeReview(FULL_RUN, { marks: {}, overall: null, note: "" });
  for (const expected of [
    "## Agenda",
    "next quarter ownership",
    "Used in the question plan: yes",
    "Covered by the end: no",
    "## Role context the engine was given",
    "senior-backend-engineer--senior",
    "## Last time's actions",
    "Send the scope note → partly",
    "## Focus points",
    "What she'll own next quarter",
    "## Actions agreed in this 1:1",
    "Send two options",
    "Model spend: $0.1139",
    "Lane: manual · regression:biweekly-priya",
  ]) {
    assert.ok(text.includes(expected), `missing from the copy: ${expected}`);
  }
});

test("serializeReview: each turn carries its coach hints and the planner's read", () => {
  const text = serializeReview(FULL_RUN, { marks: {}, overall: null, note: "" });
  assert.ok(text.includes("[wellbeing · pulse · generated]"));
  assert.ok(text.includes("coach (ask): Keep it calm."));
  assert.ok(text.includes("coach (listen): Whether she names recovery."));
  assert.ok(text.includes("read: note"));
  assert.ok(text.includes("planner note: Mild flatness signal."));
});

test("serializeReview: the recap copies in full, including the parts the old export dropped", () => {
  const text = serializeReview(FULL_RUN, { marks: {}, overall: null, note: "" });
  assert.ok(text.includes("Honest read (them): She has stopped pushing on mentoring."));
  assert.ok(text.includes("Honest read (you): You left the thread open for months."));
  assert.ok(text.includes("Reminder: Whether she raises mentoring unprompted."));
  assert.ok(text.includes("Axis clarity: -2. Unsure of her next area"));
  assert.ok(text.includes("Engagement read: read"));
  assert.ok(text.includes("recommended action: Name the options."));
});

test("serializeReview: an axis nothing read prints 'not read', never a seed number", () => {
  const run = { ...FULL_RUN, briefing: { ...FULL_RUN.briefing, axes: [{ id: "trust", score: -1, meaning: "no signal", read_status: "not_read", not_read_reason: "no_history" }] } };
  const text = serializeReview(run, { marks: {}, overall: null, note: "" });
  assert.ok(text.includes("Axis trust: not read (no_history)"));
  assert.ok(!text.includes("Axis trust: -1"));
});

test("serializeReview: a run without those inputs prints no empty sections", () => {
  const bare = { id: "2026_Aug01_18-00-abc", ctx: { name: "Priya" }, turns: [], briefing: null };
  const text = serializeReview(bare, { marks: {}, overall: null, note: "" });
  for (const absent of ["## Agenda", "## Role context", "## Last time's actions", "## Focus points", "## Actions agreed"]) {
    assert.ok(!text.includes(absent), `an absent input still printed a heading: ${absent}`);
  }
  assert.ok(text.includes("## Prep brief"), "the fixed sections still print");
});

test("serializeReview: a fallback recap is flagged, not passed off as a real one", () => {
  const run = { ...FULL_RUN, briefing: { ...FULL_RUN.briefing, generation_failed: true } };
  assert.ok(serializeReview(run, { marks: {}, overall: null, note: "" }).includes("FALLBACK RECAP"));
});

test("serializeReview: repeated copies of the same review are byte-identical", () => {
  const review = { marks: { role_aware: "pass" }, overall: "fix", note: "n" };
  assert.equal(serializeReview(FULL_RUN, review), serializeReview(FULL_RUN, review));
});

test("the verdict grid is unchanged: 8 dimensions, status derived from marks", () => {
  assert.equal(reviewStatusFromMarks({}), "none");
  assert.equal(reviewStatusFromMarks({ role_aware: "pass" }), "partial");
  assert.equal(libraryBadge("partial", null).label, "Incomplete");
});
