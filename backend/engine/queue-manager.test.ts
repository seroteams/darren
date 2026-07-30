import test from "node:test";
import assert from "node:assert/strict";
import { enforceCloserOnFinalTurn, enforceBudgetLength, clampToSignature, enforceDrillCap, markThreadFollow, RESPONSE_SCHEMA } from "./queue-manager.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import type { Question } from "../shared/question.types.ts";
import type { Arc } from "./queue-constants.ts";

const emptyArc = { arc: [] } as unknown as Arc; // no remaining stages → isolates the drill-cap slice loop

// Queue-shape gates (Phase 2). The two new gates are pure — they only read
// `.alias` off each item — so they're tested here with minimal stand-ins. The
// last two tests are regressions locking gates that already existed before this
// phase (off-signature clamp, relational-arc competency), so they can't quietly
// break.

const q = (alias: string): Question => ({ alias } as unknown as Question);

// --- Budget-length gate ----------------------------------------------------

test("enforceBudgetLength: over remaining_budget+1 is truncated from the tail", () => {
  const issues: string[] = [];
  const out = enforceBudgetLength({
    newQueue: [q("a"), q("b"), q("c"), q("d"), q("e"), q("f"), q("g")],
    remainingBudget: 5,
    issues,
  });
  assert.equal(out.length, 6); // 5 + 1
  assert.deepEqual(out.map((x) => x.alias), ["a", "b", "c", "d", "e", "f"]);
  assert.equal(issues.length, 1);
});

test("enforceBudgetLength: remaining_budget<=2 truncates to exactly the budget", () => {
  const out2 = enforceBudgetLength({ newQueue: [q("a"), q("b"), q("c"), q("d")], remainingBudget: 2, issues: [] });
  assert.deepEqual(out2.map((x) => x.alias), ["a", "b"]);
  const out1 = enforceBudgetLength({ newQueue: [q("a"), q("b"), q("c")], remainingBudget: 1, issues: [] });
  assert.deepEqual(out1.map((x) => x.alias), ["a"]);
});

test("enforceBudgetLength: a queue already within budget is untouched", () => {
  const issues: string[] = [];
  const out = enforceBudgetLength({ newQueue: [q("a"), q("b")], remainingBudget: 5, issues });
  assert.deepEqual(out.map((x) => x.alias), ["a", "b"]);
  assert.equal(issues.length, 0);
});

// --- Closer-on-final-turn gate ---------------------------------------------

test("enforceCloserOnFinalTurn: no-op when it is not the final turn", () => {
  const out = enforceCloserOnFinalTurn({
    newQueue: [q("drill"), q("closer")],
    remainingBudget: 3,
    closerAlias: "closer",
    remainingQueue: [],
    issues: [],
  });
  assert.deepEqual(out.map((x) => x.alias), ["drill", "closer"]);
});

test("enforceCloserOnFinalTurn: final turn moves an out-of-place closer to the front", () => {
  const issues: string[] = [];
  const out = enforceCloserOnFinalTurn({
    newQueue: [q("drill"), q("closer"), q("other")],
    remainingBudget: 1,
    closerAlias: "closer",
    remainingQueue: [],
    issues,
  });
  assert.equal(out[0]?.alias, "closer");
  assert.equal(issues.length, 1);
});

test("enforceCloserOnFinalTurn: final turn pulls a missing closer from the remaining queue", () => {
  const out = enforceCloserOnFinalTurn({
    newQueue: [q("drill")],
    remainingBudget: 1,
    closerAlias: "closer",
    remainingQueue: [q("closer")],
    issues: [],
  });
  assert.equal(out[0]?.alias, "closer");
});

test("enforceCloserOnFinalTurn: no reserved closer means no-op", () => {
  const out = enforceCloserOnFinalTurn({
    newQueue: [q("drill")],
    remainingBudget: 1,
    closerAlias: "(none)",
    remainingQueue: [],
    issues: [],
  });
  assert.deepEqual(out.map((x) => x.alias), ["drill"]);
});

// --- Drill cap: pin the runtime thread-follow (thread-follow Phase 1) -------

const tf = (alias: string, stage: string): Question =>
  ({ alias, source: "planner_added", label: "Thread follow", stage } as unknown as Question);
const drill = (alias: string, stage: string): Question =>
  ({ alias, source: "planner_added", stage } as unknown as Question);

test("enforceDrillCap: a runtime thread-follow at slot 0 is pinned, not eaten as a same-stage drill", () => {
  const issues: string[] = [];
  const out = enforceDrillCap({
    newQueue: [tf("follow", "explore"), drill("drill", "explore"), q("keep")],
    lastQuestion: { stage: "explore" } as unknown as Question,
    remainingQueue: [],
    consecutiveDrillCount: 2,
    transcript: [],
    arc: emptyArc,
    issues,
  });
  // The follow survives at the front; the real same-stage drill behind it is still capped.
  assert.equal(out[0]?.alias, "follow");
  assert.ok(!out.some((x) => x.alias === "drill"));
  assert.ok(issues.some((i) => i.includes("drill cap")));
});

test("enforceDrillCap: without a thread-follow, a same-stage drill at the front is still capped", () => {
  const issues: string[] = [];
  const out = enforceDrillCap({
    newQueue: [drill("drill", "explore"), q("keep")],
    lastQuestion: { stage: "explore" } as unknown as Question,
    remainingQueue: [],
    consecutiveDrillCount: 2,
    transcript: [],
    arc: emptyArc,
    issues,
  });
  assert.deepEqual(out.map((x) => x.alias), ["keep"]);
  assert.ok(issues.some((i) => i.includes("drill cap")));
});

// --- Thread-follow: mark what the planner did, never write a question --------

// A substantive answer the planner's first item does not pick up. The engine
// notes it and leaves the queue exactly as it found it (until 2026-07-30 it
// injected a fixed code-written stem here instead).
const UNFOLLOWED_ANSWER = "the partner rollout keeps stalling on leadership sign-off";

test("markThreadFollow: a dropped thread is noted, and the queue is untouched", () => {
  const issues: string[] = [];
  const queue = [q("planned")];
  markThreadFollow({
    newQueue: queue,
    lastAnswer: UNFOLLOWED_ANSWER,
    lastQuestion: drill("d1", "explore"), // a normal same-stage drill, not a follow-up
    remainingBudget: 6, // drill count doesn't gate this — only "was the last Q itself a follow?"
    issues,
  });
  assert.deepEqual(queue.map((x) => x.alias), ["planned"]);
  assert.ok(issues.some((i) => i.includes("dropped the open thread")));
});

test("markThreadFollow: a follow-up is never chased with another follow-up", () => {
  const issues: string[] = [];
  const queue = [q("planned")];
  markThreadFollow({
    newQueue: queue,
    lastAnswer: UNFOLLOWED_ANSWER,
    lastQuestion: tf("prev-follow", "explore"), // last question was itself a follow-up
    remainingBudget: 6,
    issues,
  });
  assert.deepEqual(queue.map((x) => x.alias), ["planned"]); // unchanged
  assert.equal(issues.length, 0); // bailed before the check, so no note either
});

// The drill cap used to pin only code-minted follow-ups. A model-written
// follow-up shares the last question's stage, so without the `follows_thread`
// pin the cap eats it exactly when someone keeps opening up (thread-follow P1).
test("enforceDrillCap: a model-written follow-up at slot 0 survives drill pressure", () => {
  const issues: string[] = [];
  const follow = { ...drill("model-follow", "explore"), follows_thread: true };
  const out = enforceDrillCap({
    newQueue: [follow, drill("d2", "explore")],
    lastQuestion: drill("d1", "explore"),
    remainingQueue: [],
    consecutiveDrillCount: 2,
    transcript: [],
    arc: emptyArc,
    issues,
  });
  assert.equal(out[0]?.alias, "model-follow", "the cap ate the planner's follow-up");
});

// --- Regression: gates that already existed --------------------------------

test("clampToSignature: an off-signature axis is dropped, an in-signature one clamped", () => {
  const { deltas } = clampToSignature({ growth: 3, wellbeing: 2 }, { growth: 1 });
  assert.deepEqual(deltas, { growth: 1 }); // wellbeing dropped, growth clamped 3→1
});

test("isRelationalArc: check-in and feels-off are relational; performance is not", () => {
  assert.equal(isRelationalArc("bi_weekly_check_in"), true);
  assert.equal(isRelationalArc("something_feels_off"), true);
  assert.equal(isRelationalArc("performance_feedback"), false);
});

// --- Planner schema: the strict-mode trap (question-support-hints Phase 2) ----

// The planner call runs with strict structured outputs, where OpenAI rejects any
// schema whose `required` omits a key in `properties` — the whole request 400s.
// The bank stage hit exactly this when `hints` was added to properties alone, and
// its fallback swallowed the error for nine days. This walks the WHOLE planner
// schema so the same trap can't be set here.
test("planner RESPONSE_SCHEMA: every property is listed in required (strict mode)", () => {
  const gaps: string[] = [];
  const walk = (node: Record<string, unknown>, path: string): void => {
    if (!node || typeof node !== "object") return;
    const props = node.properties as Record<string, Record<string, unknown>> | undefined;
    if (node.type === "object" && props) {
      const required = Array.isArray(node.required) ? (node.required as string[]) : [];
      for (const key of Object.keys(props)) {
        if (!required.includes(key)) gaps.push(`${path}.${key}`);
        walk(props[key] as Record<string, unknown>, `${path}.${key}`);
      }
    }
    if (node.type === "array" && node.items) walk(node.items as Record<string, unknown>, `${path}[]`);
  };
  walk(RESPONSE_SCHEMA as unknown as Record<string, unknown>, "");
  assert.deepEqual(gaps, [], `missing from required: ${gaps.join(", ")}`);
});

test("planner RESPONSE_SCHEMA: each queued question carries exactly 3 tagged hints", () => {
  const item = RESPONSE_SCHEMA.properties.new_queue.items as {
    properties: { hints: { minItems: number; maxItems: number; items: { properties: { kind: { enum: string[] } } } } };
  };
  assert.equal(item.properties.hints.minItems, 3);
  assert.equal(item.properties.hints.maxItems, 3);
  assert.deepEqual(item.properties.hints.items.properties.kind.enum, ["ask", "listen"]);
});

// Living plan (no dead wires P3): the grounding corpus is the haystack a
// planner-written premise must be found in. Extracted as a pure function so the
// P4 notes wire can be proven here rather than assumed.
test("buildGroundingCorpus: carries intake context and answers; mid-run notes join only when provided", async () => {
  const { buildGroundingCorpus } = await import("./queue-manager.ts");
  const args = {
    ctx: { name: "Daryl", role: "UX Designer", meetingType: "Bi-weekly check-in", notes: "Odin cutover slipping" },
    transcript: [
      { turn: 1, question: { alias: "q_1", name: "How is the fortnight?" }, answer: "Heavy, mostly the cutover.", skipped: false },
    ],
    remainingQueue: [{ alias: "q_2", name: "What would help most?" }],
    prep: { coreIssue: "cutover load" },
    focusPoints: [{ id: "workload", label: "Workload" }],
  };
  const without = buildGroundingCorpus(args as never);
  assert.ok(without.includes("cutover"), "intake note text grounds the corpus");
  assert.ok(without.includes("heavy"), "answers ground the corpus");
  assert.ok(!without.includes("glancing"), "no ghost note text");
  const withNotes = buildGroundingCorpus({
    ...args,
    sessionNotes: [{ text: "He keeps glancing at his phone, seems flat." }],
  } as never);
  assert.ok(withNotes.includes("glancing"), "a mid-run note joins the corpus so note-grounded questions survive the gate");
});

// --- The reserved closer takes the freshest coaching (coach-hints-live P2b) ---
//
// The closer is chosen at bank time and stashed as a whole question object, so it
// is the one question that never passes through the reconcile rebuild. It reached
// the manager carrying hints written before the meeting started — found by the
// biweekly-priya proof run, where the planner had written four fresh hint sets for
// that exact question across the meeting and all four were discarded.
//
// It cannot be matched on alias: reconcile mints a NEW alias every time it rebuilds
// a carried question, so the refreshed twin sits in the queue as q_x_79 while the
// stashed closer is q_x_76. The question TEXT is what survives a carry, so that is
// what these match on.

const STALE = [
  { kind: "ask" as const, text: "Land it on the next two weeks and keep it concrete." },
  { kind: "listen" as const, text: "Whether she asks for a change in scope, timing, or support." },
  { kind: "listen" as const, text: "Whether the answer points to one thing to do first." },
];
const FRESH = [
  { kind: "ask" as const, text: "Pick up the mentoring thread she just raised." },
  { kind: "listen" as const, text: "Whether next quarter's ownership is still open for her." },
  { kind: "listen" as const, text: "Whether she names one change or stays broad." },
];

const CLOSER_TEXT = "What would make the next two weeks steadier for you?";
// Same question, different alias and fresher coaching — what reconcile leaves behind.
const twin = (alias: string, hints: unknown): Question =>
  ({ alias, name: CLOSER_TEXT, hints } as unknown as Question);
const stashedCloser = (): Question =>
  ({ alias: "q_next_two_weeks_76", name: CLOSER_TEXT, hints: STALE } as unknown as Question);

test("enforceCloserOnFinalTurn: the pulled-in closer takes its twin's fresh hints", () => {
  const out = enforceCloserOnFinalTurn({
    newQueue: [twin("q_next_two_weeks_79", FRESH)],
    remainingBudget: 1,
    closerAlias: "q_next_two_weeks_76",
    remainingQueue: [stashedCloser()],
    issues: [],
  });
  assert.equal(out[0]?.alias, "q_next_two_weeks_76"); // still the reserved closer
  assert.equal(out[0]?.name, CLOSER_TEXT); // wording untouched
  assert.deepEqual(out[0]?.hints, FRESH); // coaching is this turn's
});

test("enforceCloserOnFinalTurn: a closer already at the front still takes fresh hints", () => {
  const out = enforceCloserOnFinalTurn({
    newQueue: [stashedCloser(), twin("q_next_two_weeks_79", FRESH)],
    remainingBudget: 1,
    closerAlias: "q_next_two_weeks_76",
    remainingQueue: [],
    issues: [],
  });
  assert.deepEqual(out[0]?.hints, FRESH);
});

test("enforceCloserOnFinalTurn: no twin means the closer keeps its own coaching", () => {
  const out = enforceCloserOnFinalTurn({
    newQueue: [q("something_else")],
    remainingBudget: 1,
    closerAlias: "q_next_two_weeks_76",
    remainingQueue: [stashedCloser()],
    issues: [],
  });
  assert.deepEqual(out[0]?.hints, STALE);
});

test("enforceCloserOnFinalTurn: a twin with no usable hints never empties the panel", () => {
  const out = enforceCloserOnFinalTurn({
    newQueue: [twin("q_next_two_weeks_79", [])],
    remainingBudget: 1,
    closerAlias: "q_next_two_weeks_76",
    remainingQueue: [stashedCloser()],
    issues: [],
  });
  assert.deepEqual(out[0]?.hints, STALE);
});

test("enforceCloserOnFinalTurn: refreshing hints does not mutate the stashed closer", () => {
  const stashed = stashedCloser();
  const out = enforceCloserOnFinalTurn({
    newQueue: [twin("q_next_two_weeks_79", FRESH)],
    remainingBudget: 1,
    closerAlias: "q_next_two_weeks_76",
    remainingQueue: [stashed],
    issues: [],
  });
  assert.notEqual(out[0], stashed);
  assert.deepEqual(stashed.hints, STALE); // session.closer is reused every turn
});
