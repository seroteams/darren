// Home's row vocabulary (home-screen-truth Phase 1). start-core.js mounts through
// the DOM, so its own guard reads source text; these are the real behaviour tests.
// The rule under test: the raw `headline` blob must never reach the screen — it is
// "Name · Role · Seniority · MeetingType" and the seniority field has been seen
// carrying an email address.
import test from "node:test";
import assert from "node:assert/strict";
import { rowModel, orderForHome } from "./start-rows.ts";

const DAY = 86_400_000;
const run = (over = {}) => ({
  id: "r1",
  headline: "Carl Heaton · UX Lead · carl@example.com · Bi-weekly check-in",
  lastSeenAt: Date.now() - 2 * DAY,
  stage: "BRIEFING",
  ...over,
});

test("the name comes from ctx, never from the headline blob", () => {
  const m = rowModel(run({ ctx: { name: "Priya", meetingType: "Growth conversation" } }));
  assert.equal(m.name, "Priya");
});

test("a run with no ctx name reads 'Untitled 1:1'; the blob is never a fallback", () => {
  for (const r of [run({ ctx: undefined }), run({ ctx: {} }), run({ ctx: { name: "" } })]) {
    const m = rowModel(r);
    assert.equal(m.name, "Untitled 1:1");
    assert.ok(!m.name.includes("@"), "no email can reach the row");
    assert.ok(!m.name.includes("·"), "no middot blob can reach the row");
  }
});

test("a ctx-less run does not throw", () => {
  assert.doesNotThrow(() => rowModel({ id: "x" }));
});

test("the second line is meeting type then date, and drops what's missing", () => {
  const withBoth = rowModel(run({ ctx: { name: "Priya", meetingType: "Feels off" }, lastSeenAt: Date.now() - 2 * DAY }));
  assert.equal(withBoth.sub, "Feels off · 2d ago");

  const noType = rowModel(run({ ctx: { name: "Priya" }, lastSeenAt: Date.now() - 2 * DAY }));
  assert.equal(noType.sub, "2d ago", "no leading separator when the type is missing");

  const noDate = rowModel(run({ ctx: { name: "Priya", meetingType: "Feels off" }, lastSeenAt: 0 }));
  assert.equal(noDate.sub, "Feels off", "no trailing separator when the date is missing");
});

test("status is one bit: BRIEFING is done, every other stage is open", () => {
  assert.equal(rowModel(run({ stage: "BRIEFING" })).status, "done");
  for (const stage of ["FOCUS_POINTS", "PREPARATION", "BANK", "QUESTIONING", "EVAL"]) {
    assert.equal(rowModel(run({ stage })).status, "open", `${stage} is unfinished`);
  }
  assert.equal(rowModel(run({ stage: undefined })).status, "open", "an unknown stage is not claimed as finished");
});

test("orderForHome hoists the newest unfinished prep to the top", () => {
  const rows = [
    run({ id: "done-new", stage: "BRIEFING", lastSeenAt: 900 }),
    run({ id: "open-old", stage: "QUESTIONING", lastSeenAt: 100 }),
    run({ id: "open-new", stage: "BANK", lastSeenAt: 500 }),
    run({ id: "done-old", stage: "BRIEFING", lastSeenAt: 300 }),
  ];
  const ids = orderForHome(rows, 4).map((r) => r.id);
  assert.equal(ids[0], "open-new", "the newest unfinished one leads");
  assert.deepEqual(ids.slice(1), ["done-new", "open-old", "done-old"], "the rest stay in recency order");
});

test("orderForHome caps the list and leaves an all-finished list alone", () => {
  const rows = [1000, 800, 600, 400].map((t, i) => run({ id: `r${i}`, stage: "BRIEFING", lastSeenAt: t }));
  assert.deepEqual(orderForHome(rows, 3).map((r) => r.id), ["r0", "r1", "r2"]);
});

// home-screen-truth Phase 3. Every new signup is seeded with an example 1:1, and an
// unlabelled example reads as a product that invents history.
test("a seeded run is marked as an example; a real one never is", () => {
  assert.equal(rowModel(run({ isDemo: true })).isExample, true);
  assert.equal(rowModel(run({ isDemo: false })).isExample, false);
  assert.equal(rowModel(run({})).isExample, false, "absent means real, never assumed");
  assert.equal(rowModel({ id: "x" }).isExample, false, "a bare run does not throw or guess");
});

test("orderForHome survives an empty list and a missing cap", () => {
  assert.deepEqual(orderForHome([], 3), []);
  assert.equal(orderForHome([run(), run({ id: "b" })]).length, 2);
});
