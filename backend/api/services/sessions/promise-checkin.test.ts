import { test } from "node:test";
import assert from "node:assert/strict";
import { checkinEligible, priorPromisesForSession, recordPromiseOutcomes } from "./promise-checkin.ts";
import type { CheckinDeps } from "./promise-checkin.ts";
import type { Session, SessionPromise } from "../../../shared/session.types.ts";

// Promises loop phase 2 — the card-zero glue: eligibility, the prior read, and
// the write-back that puts taps onto the PRIOR run (live map first, store
// otherwise) and stamps the CURRENT session's priorCheckin for phase 3.

const promise = (id: string, over: Partial<SessionPromise> = {}): SessionPromise => ({
  id,
  owner: "manager",
  action: `do ${id}`,
  when: "this week",
  outcome: null,
  at: 1,
  ...over,
});

function fakeSession(over: Partial<Session> = {}): Session {
  return {
    id: "current",
    orgId: "org1",
    userId: "user1",
    personId: "person1",
    transcript: [],
    mode: "manual",
    priorCheckin: null,
    ...over,
  } as unknown as Session;
}

function fakeDeps(over: Partial<CheckinDeps> = {}): CheckinDeps & { persisted: Session[]; storeWrites: unknown[] } {
  const persisted: Session[] = [];
  const storeWrites: unknown[] = [];
  return {
    persisted,
    storeWrites,
    findPrior: async () => ({ sessionId: "prior", when: 10, promises: [promise("a"), promise("b", { owner: "report" })] }),
    writeToStore: async (runId, fence, taps) => {
      storeWrites.push({ runId, fence, taps });
      return true;
    },
    liveSession: () => undefined,
    persist: (s) => {
      persisted.push(s);
    },
    ...over,
  };
}

test("checkinEligible: only a fresh, unscripted, person-linked session qualifies", () => {
  assert.equal(checkinEligible(fakeSession()), true);
  assert.equal(checkinEligible(fakeSession({ transcript: [{} as never] })), false); // already past Q1
  assert.equal(checkinEligible(fakeSession({ mode: "scripted" })), false); // QA lane
  assert.equal(checkinEligible(fakeSession({ personId: null })), false); // guest/unlinked
  assert.equal(checkinEligible(fakeSession({ userId: null })), false); // anonymous
  assert.equal(checkinEligible(fakeSession({ priorCheckin: { fromSessionId: "x", skipped: true, outcomes: [], at: 1 } })), false); // already answered/skipped
});

test("priorPromisesForSession: eligible session gets the prior run, ineligible gets null", async () => {
  const deps = fakeDeps();
  const prior = await priorPromisesForSession(fakeSession(), deps);
  assert.ok(prior);
  assert.equal(prior.sessionId, "prior");
  assert.equal(await priorPromisesForSession(fakeSession({ mode: "scripted" }), deps), null);
});

test("recordPromiseOutcomes: taps land on the LIVE prior session when it's in memory", async () => {
  const livePrior = fakeSession({ id: "prior", promises: [promise("a"), promise("b")] });
  const deps = fakeDeps({ liveSession: (id) => (id === "prior" ? livePrior : undefined) });
  const current = fakeSession();

  const res = await recordPromiseOutcomes(current, { outcomes: [{ id: "a", outcome: "yes" }, { id: "b", outcome: "no" }] }, deps);
  assert.equal(res.ok, true);
  assert.equal(res.applied, 2);
  assert.equal(deps.storeWrites.length, 0); // live path — no store write
  assert.equal(livePrior.promises![0]!.outcome, "yes"); // the DESTINATION really changed
  assert.equal(livePrior.outcomeCheck, "partly"); // yes+no → mixed
  // both the prior and the current session were persisted
  assert.deepEqual(deps.persisted.map((s) => s.id), ["prior", "current"]);
  // the current session carries the check-in for phase 3
  assert.equal(current.priorCheckin!.fromSessionId, "prior");
  assert.equal(current.priorCheckin!.skipped, false);
  assert.deepEqual(current.priorCheckin!.outcomes.map((o) => o.outcome), ["yes", "no"]);
});

test("recordPromiseOutcomes: falls back to the store when the prior run left memory", async () => {
  const deps = fakeDeps();
  const current = fakeSession();
  const res = await recordPromiseOutcomes(current, { outcomes: [{ id: "a", outcome: "partly" }] }, deps);
  assert.equal(res.ok, true);
  assert.equal(deps.storeWrites.length, 1);
  const w = deps.storeWrites[0] as { runId: string; taps: unknown[] };
  assert.equal(w.runId, "prior");
  assert.equal(w.taps.length, 1);
});

test("recordPromiseOutcomes: skip stamps the current session and writes NOTHING back", async () => {
  const deps = fakeDeps();
  const current = fakeSession();
  const res = await recordPromiseOutcomes(current, { skipped: true }, deps);
  assert.equal(res.ok, true);
  assert.equal(res.skipped, true);
  assert.equal(deps.storeWrites.length, 0); // no outcomes invented
  assert.equal(current.priorCheckin!.skipped, true);
  assert.deepEqual(current.priorCheckin!.outcomes, []);
});

test("recordPromiseOutcomes: rejects junk — bad shapes, unknown ids, no prior", async () => {
  const deps = fakeDeps();
  await assert.rejects(() => recordPromiseOutcomes(fakeSession(), {}, deps), /outcomes/);
  await assert.rejects(() => recordPromiseOutcomes(fakeSession(), { outcomes: [{ id: "a", outcome: "maybe" }] }, deps), /outcome/);
  await assert.rejects(() => recordPromiseOutcomes(fakeSession(), { outcomes: [{ id: "zz", outcome: "yes" }] }, deps), /match/);
  const noPrior = fakeDeps({ findPrior: async () => null });
  await assert.rejects(() => recordPromiseOutcomes(fakeSession(), { outcomes: [{ id: "a", outcome: "yes" }] }, noPrior), /open promises/);
});
