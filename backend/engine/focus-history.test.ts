// Focus history for repeat sessions (focus-freshness Phase 1).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  historyRunMatches,
  historySessionFromState,
  filterHistoryForArc,
  renderFocusHistoryBlock,
  type FocusHistorySession,
} from "./focus-history.ts";

const OWNER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const PERSON = "33333333-3333-3333-3333-333333333333";

function finishedState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "run-1",
    briefing: { headline: "x" },
    userId: OWNER,
    personId: PERSON,
    lastSeenAt: 1750000000000,
    ctx: { meetingType: "Bi-weekly check-in" },
    focusPointsResult: {
      meeting_type: "Bi-weekly check-in",
      focus_points: [
        { id: "workload", type: "Workload & capacity", category: "wellbeing", label: "Late nights — push or overload?" },
        { id: "priorities", type: "Priorities & goals", category: "topic", label: "Work in flight this cycle." },
      ],
    },
    ...overrides,
  };
}

// --- historyRunMatches: the fence ------------------------------------------

test("matches a run owned by the same manager for the same person", () => {
  assert.equal(historyRunMatches(finishedState(), { userId: OWNER, personId: PERSON }), true);
});

test("an unfinished prep counts too — the agenda was suggested either way", () => {
  assert.equal(historyRunMatches(finishedState({ briefing: null }), { userId: OWNER, personId: PERSON }), true);
});

test("never matches another manager's run for the same person", () => {
  assert.equal(historyRunMatches(finishedState(), { userId: OTHER, personId: PERSON }), false);
});

test("never matches without a personId (no name-guessing)", () => {
  assert.equal(historyRunMatches(finishedState(), { userId: OWNER, personId: "" }), false);
  assert.equal(historyRunMatches(finishedState({ personId: null }), { userId: OWNER, personId: PERSON }), false);
});

test("never matches with a missing userId", () => {
  assert.equal(historyRunMatches(finishedState(), { userId: null, personId: PERSON }), false);
});

// --- historySessionFromState: the mapper ------------------------------------

test("maps a run's focus output to a history session", () => {
  const s = historySessionFromState(finishedState());
  assert.ok(s);
  assert.equal(s.meetingType, "Bi-weekly check-in");
  assert.equal(s.when, 1750000000000);
  assert.deepEqual(s.points.map((p) => p.id), ["workload", "priorities"]);
});

test("returns null when the run has no focus output", () => {
  assert.equal(historySessionFromState(finishedState({ focusPointsResult: null })), null);
  assert.equal(historySessionFromState(finishedState({ focusPointsResult: { focus_points: [] } })), null);
});

test("drops malformed points but keeps the rest", () => {
  const s = historySessionFromState(
    finishedState({
      focusPointsResult: { focus_points: [{ id: "", label: "broken" }, { id: "energy", type: "Energy & wellbeing", category: "wellbeing", label: "ok" }] },
    })
  );
  assert.ok(s);
  assert.deepEqual(s.points.map((p) => p.id), ["energy"]);
});

// --- filterHistoryForArc: relational arcs never see competency history ------

const MIXED: FocusHistorySession[] = [
  {
    when: 1,
    meetingType: "Performance & feedback",
    points: [
      { id: "quality", type: "Quality", category: "competency", label: "Bug rate" },
      { id: "growth", type: "Growth & development", category: "topic", label: "Path to Staff" },
    ],
  },
  {
    when: 2,
    meetingType: "Performance & feedback",
    points: [{ id: "impact", type: "Impact", category: "competency", label: "Leverage" }],
  },
];

test("relational arc drops competency history points and empty sessions", () => {
  const out = filterHistoryForArc(MIXED, "Bi-weekly check-in");
  assert.equal(out.length, 1);
  assert.deepEqual(out[0]?.points.map((p) => p.id), ["growth"]);
});

test("evaluative arc keeps history untouched", () => {
  assert.deepEqual(filterHistoryForArc(MIXED, "Performance & feedback"), MIXED);
});

// --- renderFocusHistoryBlock: what the prompt sees ---------------------------

test("empty history renders the first-session line, never a dangling placeholder", () => {
  const block = renderFocusHistoryBlock([], "Bi-weekly check-in");
  assert.match(block, /first session/i);
  assert.doesNotMatch(block, /\{\{/);
});

test("renders one line per past session with catalogue type and tailored label", () => {
  const block = renderFocusHistoryBlock(
    [historySessionFromState(finishedState())!],
    "Bi-weekly check-in"
  );
  assert.match(block, /Bi-weekly check-in/);
  assert.match(block, /Workload & capacity/);
  assert.match(block, /Late nights — push or overload\?/);
});

test("relational render hides competency points from an evaluative past run", () => {
  const block = renderFocusHistoryBlock(MIXED, "Something feels off");
  assert.doesNotMatch(block, /Quality|Impact/);
  assert.match(block, /Growth & development/);
});
