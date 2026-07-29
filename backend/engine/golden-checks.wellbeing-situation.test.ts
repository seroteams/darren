// WELLBEING_SITUATION_LEAK (machar-fixes P3).
//
// The first corridor manager watched wellbeing go negative while his report described a
// team problem, calmly: "I don't think Daryl's wellbeing is impacted. I think it's the
// team and he's just not done anything about it yet. So the wellbeing score is quite a
// red flag and maybe it shouldn't be. It's not his necessarily personal wellbeing."
// (docs/validation/machar-2026-07-29.md, F4.)
//
// The gate is detect-only, like every sibling: it flags so the prompt gets fixed, and
// never edits or suppresses a score. These tests pin the line between "the person is
// struggling" and "the person is describing something hard".

import { test } from "node:test";
import assert from "node:assert/strict";
import { runWellbeingSituationGate } from "./golden-checks.ts";

const turn = (n: number, answer: string, wellbeing?: number) => ({
  turn: n,
  answer,
  ...(wellbeing === undefined ? {} : { realized_deltas: { wellbeing } }),
});

test("a hard situation with no stated strain is flagged", () => {
  const fails = runWellbeingSituationGate([
    turn(3, "team isn't pulling its weight on the beta, it's holding up the date", -3),
  ]);
  assert.equal(fails.length, 1);
  assert.match(fails[0]!, /turn 3 booked wellbeing -3/);
  assert.match(fails[0]!, /no strain stated/);
});

test("anything they say about their OWN state is left alone", () => {
  // Wider than distress on purpose. "Got a cold" is the real answer from the Machar
  // Jun-11 run, which booked wellbeing -1 correctly: a cold is the person, not the
  // situation. A gate that nags on a true positive teaches people to ignore it.
  for (const answer of [
    "honestly he's exhausted, been working most evenings",
    "said he's stressed about the handover",
    "sounds overwhelmed by the number of open threads",
    "burned out after the launch",
    "Got a cold but hopefully gone in a few days.",
    "shattered, hasn't been sleeping",
    "just back from a week off, feels better for it",
  ]) {
    assert.deepEqual(
      runWellbeingSituationGate([turn(2, answer, -3)]),
      [],
      `wrongly flagged a real strain answer: "${answer}"`,
    );
  }
});

test("strain in a different turn does not license this one", () => {
  // The over-reach being caught: a session that mentioned tiredness once, then books
  // wellbeing negatives against every later operational answer.
  const fails = runWellbeingSituationGate([
    turn(1, "he was exhausted last month but that has passed", -1),
    turn(2, "the handover between the two squads keeps dropping things", -3),
  ]);
  assert.equal(fails.length, 1, "only the operational turn should flag");
  assert.match(fails[0]!, /turn 2/);
});

test("positive, zero and unscored wellbeing are never flagged", () => {
  assert.deepEqual(runWellbeingSituationGate([turn(1, "took a proper week off", 3)]), []);
  assert.deepEqual(runWellbeingSituationGate([turn(1, "delivery date slipped", 0)]), []);
  assert.deepEqual(runWellbeingSituationGate([turn(1, "delivery date slipped")]), []);
});

test("null-safe on missing transcript, turns and fields", () => {
  assert.deepEqual(runWellbeingSituationGate(null), []);
  assert.deepEqual(runWellbeingSituationGate(undefined), []);
  assert.deepEqual(runWellbeingSituationGate([]), []);
  assert.deepEqual(runWellbeingSituationGate([{}]), []);
  assert.deepEqual(runWellbeingSituationGate([{ realized_deltas: {} }]), []);
  // A negative booked with no answer text recorded still flags: unverifiable is not clean.
  assert.equal(runWellbeingSituationGate([{ realized_deltas: { wellbeing: -1 } }]).length, 1);
});

test("sales vocabulary does not read as personal health", () => {
  // "cold" is the one word here that a working answer can carry innocently, and this
  // gate runs on 1:1s where partner and sales work come up constantly.
  const fails = runWellbeingSituationGate([
    turn(4, "cold outreach isn't converting and the pipeline is thin", -1),
  ]);
  assert.equal(fails.length, 1, "a cold-outreach answer is a situation, not their health");
});

test("other axes going negative is none of this gate's business", () => {
  assert.deepEqual(
    runWellbeingSituationGate([
      { turn: 1, answer: "priorities are a mess", realized_deltas: { clarity: -3, growth: -1 } },
    ]),
    [],
  );
});
