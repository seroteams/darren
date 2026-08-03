import { test } from "node:test";
import assert from "node:assert/strict";
import { priorRecapFromState, axesFromBriefing, renderPriorOutcomeBlock } from "./prior-recap.ts";

const AXES = [
  { id: "wellbeing", score: -4, read_status: "read" },
  { id: "engagement", score: 5, read_status: "read" },
  { id: "growth", score: 0, read_status: "not_read" },
];

const FINISHED = {
  id: "run-2",
  lastSeenAt: 1700,
  ctx: { meetingType: "Bi-weekly 1:1" },
  briefing: {
    headline: "Flat because the review cycle eats two days a sprint with nobody owning it.",
    summary_bullets: ["a", "b", "c"],
    next_actions: [{ when: "this week", action: "Back the rota at the guild" }],
    axes: AXES,
  },
  promises: [
    { id: "p1", owner: "manager", action: "Early context on the billing rewrite", when: "", outcome: "yes", at: 1 },
    { id: "p2", owner: "report", action: "Draft the rota", when: "", outcome: null, at: 1 },
  ],
};

test("priorRecapFromState projects last time and nothing else", () => {
  const r = priorRecapFromState(FINISHED)!;
  assert.equal(r.sessionId, "run-2");
  assert.equal(r.when, 1700);
  assert.equal(r.meetingType, "Bi-weekly 1:1");
  assert.match(r.headline, /^Flat because the review cycle/);
  assert.equal(r.agreedSource, "promises");
  assert.deepEqual(
    r.agreed.map((a) => [a.owner, a.action, a.outcome]),
    [
      ["manager", "Early context on the billing rewrite", "yes"],
      ["report", "Draft the rota", null],
    ],
  );
  // The transcript, the notes and the summary bullets must not travel: the brief
  // is being told what happened, not handed the whole record to re-read.
  const keys = Object.keys(r).sort();
  assert.deepEqual(keys, ["agreed", "agreedSource", "axes", "headline", "meetingType", "sessionId", "summaryMissing", "when"]);
});

test("priorRecapFromState: the headline is quoted whole, never shortened", () => {
  const long = "x".repeat(400);
  const r = priorRecapFromState({ ...FINISHED, briefing: { ...FINISHED.briefing, headline: long } })!;
  assert.equal(r.headline, long);
});

test("priorRecapFromState: an unfinished run has nothing to say about last time", () => {
  assert.equal(priorRecapFromState({ ...FINISHED, briefing: undefined }), null);
  assert.equal(priorRecapFromState({ ...FINISHED, briefing: {} }), null);
  // A briefing that generated but wrote no headline has nothing to say and does not
  // claim a reason for it. The fallback case is separate, and covered below.
  assert.equal(priorRecapFromState({ ...FINISHED, briefing: { ...FINISHED.briefing, headline: "  " } }), null);
  assert.equal(priorRecapFromState({ ...FINISHED, id: "" }), null);
  assert.equal(priorRecapFromState(null), null);
});

test("priorRecapFromState falls back to the briefing's suggestions, and says so", () => {
  const r = priorRecapFromState({ ...FINISHED, promises: [] })!;
  assert.equal(r.agreedSource, "suggested");
  // No owner: the briefing proposes an action without saying whose it is, and
  // filing it under the manager would be inventing a fact the run never held.
  assert.deepEqual(r.agreed, [{ owner: null, action: "Back the rota at the guild", outcome: null }]);
});

// A run whose briefing generation FAILED still counts as last time: its agreements
// and its live scores are real, and skipping it would silently show the meeting
// before it as "last time". What must never happen is the fallback's own
// "Briefing generation failed" line being quoted as what the conversation was.
test("a failed briefing is still last time, but its failure line is never the summary", () => {
  const failed = {
    ...FINISHED,
    briefing: {
      generation_failed: true,
      headline: "Briefing generation failed. This is a minimal record of your 1:1 with Priya, not a written read.",
      axes: AXES,
      next_actions: [],
    },
  };
  const r = priorRecapFromState(failed)!;
  assert.equal(r.summaryMissing, true);
  assert.equal(r.headline, "", "the failure notice is not the headline");
  assert.doesNotMatch(JSON.stringify(r), /generation failed/i, "and it travels nowhere else either");
  assert.equal(r.agreed.length, 2, "the agreements it did hold are real and still come");
  assert.equal(r.axes.length, 3, "so are the live scores");
});

test("summaryMissing is false on every ordinary run", () => {
  assert.equal(priorRecapFromState(FINISHED)!.summaryMissing, false);
});

test("priorRecapFromState caps the agreed list at six", () => {
  const many = Array.from({ length: 9 }, (_, i) => ({
    id: `p${i}`, owner: "manager", action: `Item ${i}`, when: "", outcome: null, at: 1,
  }));
  assert.equal(priorRecapFromState({ ...FINISHED, promises: many })!.agreed.length, 6);
});

test("axesFromBriefing keeps read_status authoritative, never a score it did not earn", () => {
  const axes = axesFromBriefing({ axes: AXES });
  assert.deepEqual(axes, [
    { id: "wellbeing", score: -4, read: true },
    { id: "engagement", score: 5, read: true },
    { id: "growth", score: null, read: false },
  ]);
  // A stored score beside read_status "not_read" is still not a read.
  assert.deepEqual(axesFromBriefing({ axes: [{ id: "clarity", score: 7, read_status: "not_read" }] }), [
    { id: "clarity", score: null, read: false },
  ]);
  assert.deepEqual(axesFromBriefing({}), []);
});

// ---- renderPriorOutcomeBlock: the {{PRIOR_OUTCOME_BLOCK}} fill -----------------------
//
// The brief is being told what HAPPENED, next to a block telling it what the
// engine GUESSED. The two must never read as the same kind of thing, so every
// test below is really about one question: does this line claim more than the
// run earned?

const recap = () => priorRecapFromState(FINISHED)!;

test("no prior run renders a sentinel, never an empty block", () => {
  const block = renderPriorOutcomeBlock(null);
  assert.match(block, /no finished 1:1 with this person yet/i);
  assert.equal(renderPriorOutcomeBlock(undefined), block);
});

test("confirmed agreements are labelled as fact, with who owed what and how it landed", () => {
  const block = renderPriorOutcomeBlock(recap(), "Bi-weekly 1:1");
  assert.match(block, /2026|1970/, "the date of that meeting is stated");
  assert.match(block, /Early context on the billing rewrite/);
  assert.match(block, /Draft the rota/);
  // Ownership survives the projection: "you" owed one, they owed the other.
  assert.match(block, /you: Early context on the billing rewrite/i);
  assert.match(block, /they: Draft the rota/i);
  // Outcomes are spelled out, including the absence of one.
  assert.match(block, /done/i);
  assert.match(block, /never checked off/i);
  // And the whole set is named for what it is.
  assert.match(block, /confirmed .*fact/i);
});

test("every outcome value gets its own plain words, and none of them invent one", () => {
  const withOutcomes = (outcome: string | null) =>
    renderPriorOutcomeBlock(
      priorRecapFromState({
        ...FINISHED,
        promises: [{ id: "p", owner: "manager", action: "The thing", when: "", outcome, at: 1 }],
      })!,
      "Bi-weekly 1:1",
    );
  assert.match(withOutcomes("yes"), /The thing: done/);
  assert.match(withOutcomes("partly"), /The thing: partly done/);
  assert.match(withOutcomes("no"), /The thing: not done/);
  assert.match(withOutcomes("changed"), /The thing: overtaken, the plan changed/);
  assert.match(withOutcomes(null), /The thing: never checked off/);
});

test("suggested actions are never dressed up as agreements", () => {
  const block = renderPriorOutcomeBlock(priorRecapFromState({ ...FINISHED, promises: [] })!, "Bi-weekly 1:1");
  assert.match(block, /never confirmed/i, "the reader is told nobody signed up to these");
  assert.doesNotMatch(block, /you both agreed/i);
  assert.doesNotMatch(block, /never checked off/i, "no follow-through was ever possible on them");
  assert.match(block, /Back the rota at the guild/);
});

test("the headline and the axis reads are marked as inference, not as record", () => {
  const block = renderPriorOutcomeBlock(recap(), "Bi-weekly 1:1");
  assert.match(block, /Flat because the review cycle/);
  assert.match(block, /inference|read of that conversation/i);
  assert.match(block, /not a transcript|not fact/i);
});

test("an axis the meeting never read says so, never a zero it did not earn", () => {
  const block = renderPriorOutcomeBlock(recap(), "Bi-weekly 1:1");
  assert.match(block, /wellbeing: -4/);
  assert.match(block, /engagement: \+5/);
  assert.match(block, /growth: not read/);
  assert.doesNotMatch(block, /growth: 0/);
});

test("a meeting with no written read says so, and never quotes the failure line", () => {
  const failed = priorRecapFromState({
    ...FINISHED,
    briefing: {
      generation_failed: true,
      headline: "Briefing generation failed. This is a minimal record, not a written read.",
      axes: AXES,
      next_actions: [],
    },
  })!;
  const block = renderPriorOutcomeBlock(failed, "Bi-weekly 1:1");
  assert.doesNotMatch(block, /generation failed/i);
  assert.match(block, /finished without a written read/i);
  // The facts it did hold still travel.
  assert.match(block, /Early context on the billing rewrite/);
  assert.match(block, /wellbeing: -4/);
});

// Arc fence, deliberately split. Facts cross meeting types (promise-history has
// no arc fence, and the runner already shows last time's actions across arcs).
// The engine's own framing does not, exactly like prep-history.
test("a relational meeting does not inherit a performance review's read or scores", () => {
  const perf = priorRecapFromState({ ...FINISHED, ctx: { meetingType: "Performance review" } })!;
  const block = renderPriorOutcomeBlock(perf, "Bi-weekly check-in");
  assert.doesNotMatch(block, /Flat because the review cycle/, "the written read does not cross the arc");
  assert.doesNotMatch(block, /wellbeing: -4/, "nor do the scores");
  assert.match(block, /Early context on the billing rewrite/, "what was agreed is still fact and still comes");
  assert.match(block, /different kind of conversation/i, "and the gap is explained, not silent");
});

test("relational to relational carries everything", () => {
  // Both sides must be a canonical relational slug: isRelationalArc matches the
  // registered set exactly, so "Bi-weekly 1:1" is not one of them.
  const rel = priorRecapFromState({ ...FINISHED, ctx: { meetingType: "Bi-weekly check-in" } })!;
  const block = renderPriorOutcomeBlock(rel, "Something feels off");
  assert.match(block, /Flat because the review cycle/);
  assert.match(block, /wellbeing: -4/);
});

test("a non-relational meeting inherits freely, same as prep-history", () => {
  const perf = priorRecapFromState({ ...FINISHED, ctx: { meetingType: "Performance review" } })!;
  const block = renderPriorOutcomeBlock(perf, "Performance review");
  assert.match(block, /Flat because the review cycle/);
});

// The copy guard does not scan backend/engine, so the rule is enforced here.
// This text is read by the model that writes the brief, and it copies what it sees.
test("the block carries no em dash and no en dash separator", () => {
  const blocks = [
    renderPriorOutcomeBlock(recap(), "Bi-weekly 1:1"),
    renderPriorOutcomeBlock(priorRecapFromState({ ...FINISHED, promises: [] })!, "Bi-weekly 1:1"),
    renderPriorOutcomeBlock(null),
  ];
  for (const b of blocks) {
    assert.doesNotMatch(b, /—/, "em dash");
    assert.doesNotMatch(b, / – /, "en dash used as a separator");
  }
});
