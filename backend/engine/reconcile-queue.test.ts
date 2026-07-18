import test from "node:test";
import assert from "node:assert/strict";
import { toAxisObject, nameWordCount, plannerNameIssue, resolvedCauseHit } from "./reconcile-queue.ts";

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
