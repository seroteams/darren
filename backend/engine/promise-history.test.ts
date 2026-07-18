import { test } from "node:test";
import assert from "node:assert/strict";
import {
  promisesFromState,
  priorPromiseRunFromState,
  rollupOutcome,
  applyPromiseOutcomes,
  formatPromiseCheckin,
} from "./promise-history.ts";

// Promises loop phase 3 — the check-in as a reviewer/planner prompt block. Manager's
// own first, unfinished items called out for roll-forward; a skip/empty check-in is inert.
test("formatPromiseCheckin lists outcomes (manager first) and flags the unfinished for roll-forward", () => {
  const out = formatPromiseCheckin({
    fromSessionId: "s1",
    skipped: false,
    at: 1,
    outcomes: [
      { id: "a", owner: "report", action: "Share the deck", outcome: "yes" },
      { id: "b", owner: "manager", action: "Revisit workload", outcome: "no" },
    ],
  });
  assert.ok(out.indexOf("Revisit workload") < out.indexOf("Share the deck"), "manager's own promise is listed first");
  assert.match(out, /NOT done/);
  assert.match(out, /roll every unfinished item into next_actions/);
});

test("formatPromiseCheckin: all-done adds nothing to next_actions", () => {
  const out = formatPromiseCheckin({
    fromSessionId: "s1", skipped: false, at: 1,
    outcomes: [{ id: "a", owner: "manager", action: "Book the room", outcome: "yes" }],
  });
  assert.match(out, /All were done/);
  assert.doesNotMatch(out, /roll every unfinished/);
});

test("formatPromiseCheckin returns the inert sentinel for skip / empty / missing", () => {
  const NONE = "(no promise check-in";
  assert.ok(formatPromiseCheckin(null).startsWith(NONE));
  assert.ok(formatPromiseCheckin(undefined).startsWith(NONE));
  assert.ok(formatPromiseCheckin({ fromSessionId: "", skipped: true, at: 1, outcomes: [] }).startsWith(NONE));
  assert.ok(formatPromiseCheckin({ fromSessionId: "", skipped: false, at: 1, outcomes: [] }).startsWith(NONE));
});

// Promises loop phase 2 — the card-zero read/write halves. The prior run's
// promises resurface at the next 1:1 with the same person; taps write outcomes
// back onto THAT run and roll up its outcomeCheck (spec §6's consumer).

const promise = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  owner: "manager",
  action: `do ${id}`,
  when: "this week",
  outcome: null,
  at: 1,
  ...over,
});

test("promisesFromState keeps only well-formed promises", () => {
  const out = promisesFromState({
    promises: [
      promise("a"),
      { id: "", owner: "manager", action: "no id", when: "", outcome: null, at: 1 },
      { id: "b", owner: "neither", action: "bad owner", when: "", outcome: null, at: 1 },
      { id: "c", owner: "report", action: "   ", when: "", outcome: null, at: 1 },
      promise("d", { owner: "report", outcome: "yes" }),
      "junk",
    ],
  });
  assert.deepEqual(out.map((p) => p.id), ["a", "d"]);
  assert.equal(out[1]!.outcome, "yes");
});

test("priorPromiseRunFromState returns only OPEN promises; fully-closed runs are null", () => {
  const open = priorPromiseRunFromState({
    id: "run1",
    lastSeenAt: 42,
    promises: [promise("a"), promise("b", { outcome: "yes" })],
  });
  assert.ok(open);
  assert.equal(open.sessionId, "run1");
  assert.equal(open.when, 42);
  assert.deepEqual(open.promises.map((p) => p.id), ["a"]); // the closed one doesn't resurface

  assert.equal(priorPromiseRunFromState({ id: "run2", promises: [promise("a", { outcome: "no" })] }), null);
  assert.equal(priorPromiseRunFromState({ id: "run3", promises: [] }), null);
  assert.equal(priorPromiseRunFromState({ id: "run4" }), null);
});

test("rollupOutcome: unanimous wins, mixed is partly, untapped is null", () => {
  assert.equal(rollupOutcome([promise("a", { outcome: "yes" }), promise("b", { outcome: "yes" })]), "yes");
  assert.equal(rollupOutcome([promise("a", { outcome: "no" }), promise("b", { outcome: "no" })]), "no");
  assert.equal(rollupOutcome([promise("a", { outcome: "changed" })]), "changed");
  assert.equal(rollupOutcome([promise("a", { outcome: "yes" }), promise("b", { outcome: "no" })]), "partly");
  assert.equal(rollupOutcome([promise("a"), promise("b")]), null); // nothing tapped → no roll-up invented
  // one tapped + one open: roll up what was declared, ignore the open one
  assert.equal(rollupOutcome([promise("a", { outcome: "yes" }), promise("b")]), "yes");
});

test("applyPromiseOutcomes writes taps onto the state and rolls up outcomeCheck", () => {
  const state: Record<string, unknown> = {
    promises: [promise("a"), promise("b"), promise("c", { outcome: "yes" })],
  };
  const applied = applyPromiseOutcomes(state, [
    { id: "a", outcome: "partly" },
    { id: "b", outcome: "yes" },
    { id: "missing", outcome: "yes" }, // unknown id — ignored, not invented
  ]);
  assert.equal(applied, 2);
  const ps = state.promises as Array<{ id: string; outcome: string | null }>;
  assert.equal(ps.find((p) => p.id === "a")!.outcome, "partly");
  assert.equal(ps.find((p) => p.id === "b")!.outcome, "yes");
  assert.equal(ps.find((p) => p.id === "c")!.outcome, "yes"); // untouched
  assert.equal(state.outcomeCheck, "partly"); // yes+partly+yes → mixed
});

test("applyPromiseOutcomes rejects bad outcome values and never fabricates", () => {
  const state: Record<string, unknown> = { promises: [promise("a")] };
  const applied = applyPromiseOutcomes(state, [{ id: "a", outcome: "maybe" as never }]);
  assert.equal(applied, 0);
  const ps = state.promises as Array<{ outcome: string | null }>;
  assert.equal(ps[0]!.outcome, null);
  assert.equal(state.outcomeCheck ?? null, null);
});
