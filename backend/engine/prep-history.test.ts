// Prep freshness (better-reads Phase 3) — the last brief for the same
// manager+person, surfaced so a repeat 1:1 opens new ground. Privacy: brief
// fields + dates only, never the manager's notes text.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  prepHistoryFromState,
  filterPrepHistoryForArc,
  renderPrepHistoryBlock,
  filePrepHistory,
  type PrepHistoryEntry,
} from "./prep-history.ts";

const OWNER = "11111111-1111-1111-1111-111111111111";
const PERSON = "33333333-3333-3333-3333-333333333333";

function finishedState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "run-1",
    userId: OWNER,
    personId: PERSON,
    lastSeenAt: 1750000000000,
    ctx: { meetingType: "Bi-weekly check-in", notes: "PRIVATE NOTES — must never surface" },
    preparationResult: {
      brief: {
        coreIssue: "Workload is drowning the mentoring thread.",
        openingQuestion: "What's been eating the mentoring time?",
        listenFor: ["whether they name the rota"],
        avoid: ["Do not diagnose"],
        goodOutcome: "A named owner for the rota.",
        suggestedAction: "During the 1:1 agree one swap.",
        confidence: "Medium — single-source notes.",
        dontAssume: "That the rota is the only cause.",
      },
      runId: "x",
      validation: { passed: true, issues: [] },
      attempts: 1,
    },
    ...overrides,
  };
}

// --- prepHistoryFromState ---------------------------------------------------

test("maps a finished state to when/meetingType/coreIssue/openingQuestion only", () => {
  const e = prepHistoryFromState(finishedState());
  assert.deepEqual(e, {
    when: 1750000000000,
    meetingType: "Bi-weekly check-in",
    coreIssue: "Workload is drowning the mentoring thread.",
    openingQuestion: "What's been eating the mentoring time?",
  });
  // Privacy: nothing else rides along.
  assert.deepEqual(Object.keys(e!).sort(), ["coreIssue", "meetingType", "openingQuestion", "when"]);
});

test("state without a prep brief maps to null", () => {
  assert.equal(prepHistoryFromState(finishedState({ preparationResult: null })), null);
  assert.equal(prepHistoryFromState({}), null);
});

test("empty brief fields map to null (nothing worth surfacing)", () => {
  const s = finishedState();
  (s.preparationResult as Record<string, unknown>).brief = { coreIssue: "", openingQuestion: "" };
  assert.equal(prepHistoryFromState(s), null);
});

// --- arc fence --------------------------------------------------------------

const relEntry: PrepHistoryEntry = {
  when: 1,
  meetingType: "Bi-weekly check-in",
  coreIssue: "x",
  openingQuestion: "y",
};
const perfEntry: PrepHistoryEntry = {
  when: 2,
  meetingType: "Performance review",
  coreIssue: "perf framing",
  openingQuestion: "perf opener",
};

test("relational meeting only sees prior relational briefs", () => {
  assert.deepEqual(filterPrepHistoryForArc([perfEntry, relEntry], "Bi-weekly check-in"), [relEntry]);
});

test("non-relational meeting sees everything", () => {
  assert.deepEqual(filterPrepHistoryForArc([perfEntry, relEntry], "Performance review"), [perfEntry, relEntry]);
});

// --- render block -----------------------------------------------------------

test("renders the first-prep sentinel when there is no history", () => {
  assert.equal(renderPrepHistoryBlock(null), "(first prep for this person — no prior brief)");
});

test("renders at most 4 lines, carrying core issue + opener", () => {
  const block = renderPrepHistoryBlock(relEntry);
  const lines = block.split("\n");
  assert.ok(lines.length <= 4, `expected <=4 lines, got ${lines.length}`);
  assert.ok(block.includes("x"));
  assert.ok(block.includes("y"));
});

test("render block never contains notes text", () => {
  const e = prepHistoryFromState(finishedState());
  assert.ok(!renderPrepHistoryBlock(e).includes("PRIVATE NOTES"));
});

// --- file walk fence (via the shared historyRunMatches) ---------------------

test("filePrepHistory returns null without both userId and personId", () => {
  assert.equal(filePrepHistory({ userId: OWNER, personId: null, excludeId: null }), null);
  assert.equal(filePrepHistory({ userId: null, personId: PERSON, excludeId: null }), null);
});
