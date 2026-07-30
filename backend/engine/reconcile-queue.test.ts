import test from "node:test";
import assert from "node:assert/strict";
import { toAxisObject, nameWordCount, plannerNameIssue, resolvedCauseHit, reconcileQueue } from "./reconcile-queue.ts";
import type { RawQueueItem } from "./queue-constants.ts";
import type { QuestionHint } from "../shared/question.types.ts";

// Item-shape gates (Phase 1). These pure predicates are the decision logic the
// reconcile loop calls to drop malformed planner items before they materialise.

// --- Axis-id whitelist -----------------------------------------------------
// toAxisObject already narrows to the four real axes; these lock that a bad id
// is silently stripped and an all-bad list collapses to empty (which the
// reconcile loop then treats as "no valid axis" → drop).

test("toAxisObject: strips an off-whitelist axis id, keeps the real ones", () => {
  const out = toAxisObject([
    { axis: "growth", delta: 3 },
    { axis: "vibes", delta: 1 },
  ]);
  assert.deepEqual(out, { growth: 3 });
});

test("toAxisObject: an all-invalid axis list collapses to empty", () => {
  assert.deepEqual(toAxisObject([{ axis: "vibes", delta: 1 }]), {});
  assert.deepEqual(toAxisObject([]), {});
});

// --- Name word cap ---------------------------------------------------------

test("nameWordCount: counts words, tolerant of extra whitespace", () => {
  assert.equal(nameWordCount("  where is your energy   at  "), 5);
  assert.equal(nameWordCount(""), 0);
  assert.equal(nameWordCount(null), 0);
});

const words = (n: number) =>
  Array.from({ length: n }, (_, i) => `w${i + 1}`).join(" ");

test("plannerNameIssue: empty or blank name is dropped", () => {
  assert.match(plannerNameIssue("") ?? "", /empty/);
  assert.match(plannerNameIssue("   ") ?? "", /empty/);
});

test("plannerNameIssue: 18 words is allowed, 19 is over the cap", () => {
  assert.equal(plannerNameIssue(words(18)), null);
  assert.match(plannerNameIssue(words(19)) ?? "", /18 words/);
});

test("plannerNameIssue: a normal short question passes", () => {
  assert.equal(plannerNameIssue("Where is your energy at, and what's driving that?"), null);
});

// --- Resolved-cause repeat gate --------------------------------------------
// The planner tags each queued item with the cause it re-probes (`probes_cause`,
// copied from `resolved_causes`) and whether it seeks a new layer (`new_layer`).
// resolvedCauseHit is the pure decision the reconcile loop uses to drop reworded
// repeats the lexical gate misses — the Jul tester answered "other pressing
// deadlines", then got re-asked "what deadlines crowd out the work".

const RESOLVED = ["other pressing deadlines eating the time"];

test("resolvedCauseHit: a reworded twin of a resolved cause is caught", () => {
  const item = {
    label: "deadline pressure",
    name: "What deadlines keep crowding out the Thailand work?",
    probes_cause: "other pressing deadlines eating the time",
    new_layer: false,
  };
  assert.equal(resolvedCauseHit(item, RESOLVED), RESOLVED[0]);
});

test("resolvedCauseHit: a new-layer follow-up on the same cause is kept", () => {
  const item = {
    label: "relieve pressure",
    name: "What would take the deadline pressure off you?",
    probes_cause: "other pressing deadlines eating the time",
    new_layer: true,
  };
  assert.equal(resolvedCauseHit(item, RESOLVED), null);
});

test("resolvedCauseHit: a question opening fresh ground is kept", () => {
  const item = { label: "growth", name: "Where do you want to stretch next quarter?", probes_cause: "", new_layer: false };
  assert.equal(resolvedCauseHit(item, RESOLVED), null);
});

test("resolvedCauseHit: a probe of a cause not yet resolved is kept", () => {
  const item = { label: "handoff", name: "Where does the handoff snag?", probes_cause: "handoff ownership unclear", new_layer: false };
  assert.equal(resolvedCauseHit(item, RESOLVED), null);
});

test("resolvedCauseHit: no resolved causes yet drops nothing", () => {
  const item = { name: "anything", probes_cause: "some cause", new_layer: false };
  assert.equal(resolvedCauseHit(item, []), null);
});

// --- Coaching hints survive the rebuild (question-support-hints Phase 2) -----

// reconcileQueue rebuilds every new or reworded planner question field by field.
// A field it doesn't name is dropped without an error — which is how mid-meeting
// questions used to reach the manager's Support panel with no coaching at all.
// These lock the carry so a future edit can't quietly undo it.

const RAW_HINTS: QuestionHint[] = [
  { kind: "ask", text: "Ask it flat, then leave the pause alone." },
  { kind: "listen", text: "Whether he names the QA environment or something else." },
  { kind: "listen", text: "Whether the trade-off was his call or handed to him." },
];

const plannerItem = (over: Record<string, unknown> = {}): RawQueueItem => ({
  ref_alias: null,
  label: "Beta path",
  name: "What has to land before the beta can go out?",
  description: "Gets the sequence out loud.",
  purpose: "topic" as const,
  stage: "explore",
  axis_effects: [{ axis: "clarity", delta: 3 }],
  grounding: "open",
  probes_cause: "",
  new_layer: true,
  hints: RAW_HINTS,
  ...over,
});

test("reconcileQueue: a brand-new planner question keeps its 3 coaching hints", () => {
  const { queue } = reconcileQueue([plannerItem()], { remainingQueue: [], askedAliases: new Set<string>() });
  assert.equal(queue.length, 1);
  assert.deepEqual(queue[0]?.hints, RAW_HINTS);
});

test("reconcileQueue: malformed hints degrade to none, they never break the turn", () => {
  const { queue } = reconcileQueue(
    [plannerItem({ hints: [{ kind: "shout", text: "nope" }, { text: "no kind" }, "not an object"] })],
    { remainingQueue: [], askedAliases: new Set<string>() },
  );
  assert.equal(queue.length, 1);
  assert.equal(queue[0]?.hints, undefined);
});

// --- A carried-forward question takes the planner's FRESH hints (coach-hints-live P2) ---
//
// The staleness this phase exists to fix lived here, not in the prompt. When the
// planner carries a question forward untouched, isUnchanged() matches on name,
// label, description and axis_effects — hints are not in that comparison — and the
// branch pushes the ORIGINAL question object, discarding the planner's payload
// whole. So coaching written before the meeting survived every turn, and telling
// the model to write fresh listen-for lines would have changed nothing on screen:
// a correct rule, completely inert. The question text still carries forward
// verbatim; only the coaching beside it is allowed to move.

const CARRIED_REF = Object.freeze({
  alias: "q_beta_path",
  label: "Beta path",
  name: "What has to land before the beta can go out?",
  description: "Gets the sequence out loud.",
  purpose: "topic" as const,
  stage: "explore",
  axis_effects: { clarity: 3 },
  source: "generated",
  hints: [
    { kind: "ask" as const, text: "Ask it flat, then leave the pause alone." },
    { kind: "listen" as const, text: "Whether he names the QA environment or something else." },
    { kind: "listen" as const, text: "Whether the trade-off was his call or handed to him." },
  ],
});

// Same name/label/description/axis_effects as the ref, so isUnchanged() matches.
const carriedItem = (hints: unknown): RawQueueItem => ({
  ref_alias: "q_beta_path",
  label: CARRIED_REF.label,
  name: CARRIED_REF.name,
  description: CARRIED_REF.description,
  purpose: "topic" as const,
  stage: "explore",
  axis_effects: [{ axis: "clarity", delta: 3 }],
  grounding: "open",
  probes_cause: "",
  new_layer: false,
  hints,
} as RawQueueItem);

const FRESH_HINTS: QuestionHint[] = [
  { kind: "ask", text: "Pick up the 14th he just named, not the beta in general." },
  { kind: "listen", text: "Whether the 14th is fixed or a date he can still move." },
  { kind: "listen", text: "Whether the second slip changed how he plans the next one." },
];

test("reconcileQueue: a carried-forward question takes the planner's fresh hints", () => {
  const { queue } = reconcileQueue([carriedItem(FRESH_HINTS)], {
    remainingQueue: [CARRIED_REF],
    askedAliases: new Set<string>(),
  });
  assert.equal(queue.length, 1);
  // Carried forward: same question, same alias, wording untouched.
  assert.equal(queue[0]?.alias, "q_beta_path");
  assert.equal(queue[0]?.name, CARRIED_REF.name);
  // ...but the coaching is the planner's, written against the latest answer.
  assert.deepEqual(queue[0]?.hints, FRESH_HINTS);
});

test("reconcileQueue: a carried-forward question keeps its old hints when the planner sends none", () => {
  const { queue } = reconcileQueue([carriedItem(undefined)], {
    remainingQueue: [CARRIED_REF],
    askedAliases: new Set<string>(),
  });
  assert.deepEqual(queue[0]?.hints, CARRIED_REF.hints);
});

test("reconcileQueue: malformed fresh hints on a carried question fall back to the old ones", () => {
  // Never leave the panel emptier than it was: bad coaching degrades to the
  // coaching that was already there, not to none.
  const { queue } = reconcileQueue([carriedItem([{ kind: "shout", text: "nope" }])], {
    remainingQueue: [CARRIED_REF],
    askedAliases: new Set<string>(),
  });
  assert.deepEqual(queue[0]?.hints, CARRIED_REF.hints);
});

test("reconcileQueue: taking fresh hints does not mutate the original question object", () => {
  const { queue } = reconcileQueue([carriedItem(FRESH_HINTS)], {
    remainingQueue: [CARRIED_REF],
    askedAliases: new Set<string>(),
  });
  assert.notEqual(queue[0], CARRIED_REF);
  assert.deepEqual(CARRIED_REF.hints, [
    { kind: "ask", text: "Ask it flat, then leave the pause alone." },
    { kind: "listen", text: "Whether he names the QA environment or something else." },
    { kind: "listen", text: "Whether the trade-off was his call or handed to him." },
  ]);
});
