import { test } from "node:test";
import assert from "node:assert/strict";
import { priorRecapFromState, axesFromBriefing } from "./prior-recap.ts";
import { recapEligible } from "../api/services/sessions/prior-recap.ts";
import type { Session } from "../shared/session.types.ts";

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

test("priorRecapFromState projects the glance and nothing else", () => {
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
  // The transcript, the notes and the summary bullets must not travel: this is a
  // glance, and the panel is the one surface that never needed the whole record.
  const keys = Object.keys(r).sort();
  assert.deepEqual(keys, ["agreed", "agreedSource", "axes", "headline", "meetingType", "sessionId", "when"]);
});

test("priorRecapFromState: the headline is quoted whole, never shortened", () => {
  const long = "x".repeat(400);
  const r = priorRecapFromState({ ...FINISHED, briefing: { ...FINISHED.briefing, headline: long } })!;
  assert.equal(r.headline, long);
});

test("priorRecapFromState: an unfinished run has nothing to say about last time", () => {
  assert.equal(priorRecapFromState({ ...FINISHED, briefing: undefined }), null);
  assert.equal(priorRecapFromState({ ...FINISHED, briefing: {} }), null);
  // A briefing with no headline is a fallback briefing; there is no line to show.
  assert.equal(priorRecapFromState({ ...FINISHED, briefing: { ...FINISHED.briefing, headline: "  " } }), null);
  assert.equal(priorRecapFromState({ ...FINISHED, id: "" }), null);
  assert.equal(priorRecapFromState(null), null);
});

test("priorRecapFromState falls back to the briefing's suggestions, and says so", () => {
  const r = priorRecapFromState({ ...FINISHED, promises: [] })!;
  assert.equal(r.agreedSource, "suggested");
  assert.deepEqual(r.agreed, [{ owner: "manager", action: "Back the rota at the guild", outcome: null }]);
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

// The eligibility fence. This is a before-you-walk-in surface, and it must not
// answer at all when there is no person or manager to fence the read on.
const session = (over: Partial<Session>): Session =>
  ({ id: "s", transcript: [], mode: "live", personId: "p1", userId: "u1", ...over }) as unknown as Session;

test("recapEligible: only before question 1, on a real person-linked run", () => {
  assert.equal(recapEligible(session({})), true);
  assert.equal(recapEligible(session({ transcript: [{}] as never })), false, "the meeting has started");
  assert.equal(recapEligible(session({ mode: "scripted" })), false, "a scripted/persona run");
  assert.equal(recapEligible(session({ personId: null as never })), false, "nothing to fence on");
  assert.equal(recapEligible(session({ userId: null as never })), false, "no manager to fence on");
});

test("recapEligible does NOT retire once last time's actions are tapped off", () => {
  // Card zero retires on priorCheckin because its job is done. Seeing what last
  // time WAS is a different job, and it outlives the tap.
  const s = session({ priorCheckin: { fromSessionId: "x", skipped: false, outcomes: [], at: 1 } as never });
  assert.equal(recapEligible(s), true);
});
