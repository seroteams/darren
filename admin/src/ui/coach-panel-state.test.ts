import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createNoteAttacher,
  rowStateFor,
  meterFor,
  parseStoredWhys,
  type AxisRead,
  type WhyMap,
} from "./coach-panel-state.ts";

// Coach panel (coach-panel Phase 1): the right half of the questioning split.
// The "why" lines are the planner's own assessment.note — never invented here.
// These tests cover the pure state: which axes a note attaches to, what a row
// shows, and the meter maths. DOM rendering is exercised in the real app.

const read = (id: string, lastDelta: number, historyLen: number): AxisRead => ({
  id,
  label: id,
  score: 0,
  lastDelta,
  historyLen,
});

test("a note attaches to exactly the axes that moved this turn", () => {
  const att = createNoteAttacher();
  att.onAxes([read("wellbeing", -1, 1), read("clarity", 0, 0), read("growth", 2, 1)]);
  const whys = att.onNote("She sounded drained talking about the review cycle.");
  assert.deepEqual(Object.keys(whys).sort(), ["growth", "wellbeing"]);
  assert.equal(whys.wellbeing.delta, -1);
  assert.equal(whys.growth.delta, 2);
  assert.equal(whys.wellbeing.why, "She sounded drained talking about the review cycle.");
});

test("note-before-axes (SSE handler race) still attaches on the next axes event", () => {
  const att = createNoteAttacher();
  const early = att.onNote("Named the single priority without hedging.");
  assert.deepEqual(early, {}); // nothing moved yet — held as pending
  const whys = att.onAxes([read("clarity", 1, 1)]);
  assert.equal(whys.clarity.why, "Named the single priority without hedging.");
});

test("a later turn's note replaces the why only on axes that moved again", () => {
  const att = createNoteAttacher();
  att.onAxes([read("wellbeing", -1, 1), read("clarity", 1, 1)]);
  att.onNote("First note.");
  att.onAxes([read("wellbeing", 0, 1), read("clarity", 2, 2)]);
  const whys = att.onNote("Second note.");
  assert.equal(whys.wellbeing.why, "First note."); // untouched this turn — keeps its why
  assert.equal(whys.clarity.why, "Second note.");
});

test("a quiet turn (nothing moved) never wipes stored whys", () => {
  const att = createNoteAttacher({ wellbeing: { delta: -1, why: "Kept." } });
  att.onAxes([read("wellbeing", 0, 1)]);
  const whys = att.onNote("Skipped question — no movement.");
  assert.equal(whys.wellbeing.why, "Kept.");
});

test("rowStateFor: unrated until first movement, rated from stored why after", () => {
  const whys: WhyMap = { clarity: { delta: 1, why: "Matched your read." } };
  assert.equal(rowStateFor(read("wellbeing", 0, 0), whys).kind, "unrated");
  const rated = rowStateFor(read("clarity", 0, 2), whys);
  assert.equal(rated.kind, "rated");
  assert.equal(rated.kind === "rated" && rated.delta, 1);
  // moved but the note event never landed (e.g. refresh mid-stream): still rated, no why text
  const bare = rowStateFor(read("growth", 2, 1), {});
  assert.equal(bare.kind, "rated");
  assert.equal(bare.kind === "rated" && bare.why, "");
});

test("meterFor: centre-out fill on a −3..+3 scale, clamped", () => {
  assert.deepEqual(meterFor(0), { pct: 50, fillLeft: 50, fillWidth: 0 });
  assert.deepEqual(meterFor(3), { pct: 100, fillLeft: 50, fillWidth: 50 });
  assert.deepEqual(meterFor(-3), { pct: 0, fillLeft: 0, fillWidth: 50 });
  const m = meterFor(-1);
  assert.ok(Math.abs(m.pct - 100 / 3) < 1e-9 && Math.abs(m.fillLeft - m.pct) < 1e-9);
  assert.ok(Math.abs(m.fillWidth - (50 - m.pct)) < 1e-9);
  assert.deepEqual(meterFor(5), meterFor(3)); // off-scale clamps to the rail
});

test("parseStoredWhys survives junk from sessionStorage", () => {
  assert.deepEqual(parseStoredWhys(null), {});
  assert.deepEqual(parseStoredWhys("not json"), {});
  assert.deepEqual(parseStoredWhys('{"clarity":{"delta":"x","why":2}}'), {});
  const good = '{"clarity":{"delta":1,"why":"ok"}}';
  assert.deepEqual(parseStoredWhys(good), { clarity: { delta: 1, why: "ok" } });
});
