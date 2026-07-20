import test from "node:test";
import assert from "node:assert/strict";
import { runRationaleArcGate } from "./golden-checks.ts";

// Rationale arc gate (coach-panel Phase 3). In a relational arc (bi-weekly check-in,
// something-feels-off) the score "why" text — the planner's per-turn assessment.note
// and the briefing's per-axis meaning — must not carry competency / craft-gap framing,
// the same rule the focus/question/role-profile arc gates enforce one layer up. This
// is a DETECT-ONLY tripwire: it flags for the prompt to be fixed, it never rewrites.

const turn = (note: string) => ({ turn: 1, answer: "ok", skipped: false, note });
const briefing = (meaning: string) => ({ axes: [{ id: "clarity", score: -1, meaning }] });

test("a competency-framed turn note in a relational arc is flagged", () => {
  const out = runRationaleArcGate(
    [turn("She's showing a real skills gap in system design — not yet at the level for the next role.")],
    null,
    "bi_weekly_check_in",
  );
  assert.ok(out.length >= 1, "expected a failure");
  assert.match(out[0] ?? "", /bi_weekly_check_in/);
});

test("a competency-framed axis meaning in a relational arc is flagged", () => {
  const out = runRationaleArcGate(
    null,
    briefing("A clear capability gap: technical depth is below the bar for staff."),
    "something_feels_off",
  );
  assert.ok(out.length >= 1);
});

test("a clean behavioural note in a relational arc passes", () => {
  const out = runRationaleArcGate(
    [turn("She named the review cycle as heavy and paused on the workload question — a mild wellbeing dip.")],
    briefing("She could not name a single priority without hedging — worth watching."),
    "bi_weekly_check_in",
  );
  assert.deepEqual(out, []);
});

test("competency framing is allowed in a non-relational arc (performance)", () => {
  const out = runRationaleArcGate(
    [turn("A real skills gap in system design; not yet at the level for the next role.")],
    briefing("A capability gap: technical depth is below the bar."),
    "performance",
  );
  assert.deepEqual(out, []);
});

test("missing transcript and briefing never throw", () => {
  assert.deepEqual(runRationaleArcGate(null, null, "bi_weekly_check_in"), []);
  assert.deepEqual(runRationaleArcGate([], { axes: [] }, "something_feels_off"), []);
});

test("a note without a note field is skipped, not crashed", () => {
  const out = runRationaleArcGate(
    [{ turn: 1, answer: "ok", skipped: false }],
    null,
    "bi_weekly_check_in",
  );
  assert.deepEqual(out, []);
});
