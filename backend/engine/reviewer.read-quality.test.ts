import test from "node:test";
import assert from "node:assert/strict";
import { computeReadQuality } from "./reviewer.ts";

// computeReadQuality now CONSUMES the banked per-turn read tag instead of
// re-deriving it. Two contracts matter: (1) a stored tag wins, so the reviewer
// and the plan-turn scorer can never disagree; (2) a legacy transcript with no
// tag still classifies on the fly, unchanged.

test("stored read tag wins over what the text would classify to", () => {
  const rq = computeReadQuality([
    // A long, real-looking answer the engine banked as thin — stored wins.
    { turn: 1, answer: "the deployment pipeline has been rock solid all sprint", read: "thin" },
    // A terse answer the engine banked as a real note — stored wins.
    { turn: 2, answer: "ok", read: "note" },
  ]);
  assert.equal(rq.turns[0]!.reason, "thin");
  assert.equal(rq.turns[0]!.is_note, false);
  assert.equal(rq.turns[1]!.reason, null);
  assert.equal(rq.turns[1]!.is_note, true);
});

test("legacy transcript (no read tag) still classifies on the fly", () => {
  const rq = computeReadQuality([
    { turn: 1, answer: "(skipped)", skipped: true },
    { turn: 2, answer: "Not sure." },
    { turn: 3, answer: "nothing to add" },
    { turn: 4, answer: "Real concern about the billing rewrite slipping past Q3" },
  ]);
  assert.equal(rq.turns[0]!.reason, "skip");
  assert.equal(rq.turns[1]!.reason, "thin");
  assert.equal(rq.turns[2]!.reason, "decline");
  assert.equal(rq.turns[3]!.reason, null); // a real note
  assert.equal(rq.note_turns, 1);
});
