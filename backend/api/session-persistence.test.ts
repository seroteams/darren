import { test } from "node:test";
import assert from "node:assert/strict";
import { serialize } from "./session-persistence.ts";
import { initState } from "../engine/axes.ts";
import { createTracker } from "../engine/cost.ts";
import { TOTAL_BUDGET } from "../engine/budgets.ts";
import type { Session } from "../shared/session.types.ts";

// A minimal live Session, enough to serialize. orgId is the Phase 2 addition: it
// must survive serialize() so it lands in session-state.json on disk, where the
// run-history reads fence by it (the data wall between companies).
function fakeSession(over: Partial<Session> = {}): Session {
  return {
    id: "s1",
    dir: "/fake/s1",
    createdAt: 0,
    lastSeenAt: 0,
    completedAt: null,
    ctx: { name: "A", role: "B", seniority: "C", meetingType: "weekly", notes: "" },
    introQueue: [],
    focusPointsResult: null,
    preparationResult: null,
    bankReady: false,
    briefing: null,
    queueRef: [],
    axisState: initState(),
    transcript: [],
    turn: 0,
    totalBudget: TOTAL_BUDGET,
    closer: null,
    prepOpener: null,
    notes: [],
    agendaInput: null,
    agendaInjected: false,
    agendaCovered: null,
    turnSnapshots: [],
    pendingAnswer: null,
    lastPlanByTurn: new Map(),
    inFlight: new Map(),
    tracker: createTracker(),
    ...over,
  };
}

test("serialize carries orgId so the run's company lands on disk", () => {
  const out = serialize(fakeSession({ orgId: "org-A" }));
  assert.equal(out.orgId, "org-A");
});

test("serialize normalises a missing orgId to null (unfenced legacy run)", () => {
  const out = serialize(fakeSession());
  assert.equal(out.orgId, null);
});
