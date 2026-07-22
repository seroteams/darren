import { test } from "node:test";
import assert from "node:assert/strict";
import { runOwnedByOrg, runOwnedByUser, runVisibleToCaller, memberRunVisible, cloneRunState, personaTagOf, costFromState, overviewFields, promiseHistoryOf } from "./run-history.ts";

// costFromState (universe-monitoring P3): a run's model spend off its saved briefing.
// Null when absent or malformed — an old run must never claim "$0.00".
test("costFromState: reads usd_total + call_count off the briefing, null when absent/malformed", () => {
  assert.deepEqual(
    costFromState({ briefing: { cost: { usd_total: 0.0421, call_count: 23 } } }),
    { usd: 0.0421, calls: 23 }
  );
  assert.deepEqual(costFromState({ briefing: { cost: { usd_total: 0 } } }), { usd: 0, calls: null }, "zero is a real recorded number; missing call count is null, not 0");
  assert.equal(costFromState({ briefing: {} }), null, "no cost block");
  assert.equal(costFromState({}), null, "no briefing");
  assert.equal(costFromState(null), null);
  assert.equal(costFromState({ briefing: { cost: { usd_total: "0.04" } } }), null, "a string is malformed, not money");
});

// runOwnedByOrg is the data wall (Phase 007/2): the single rule the run-history
// reads use to decide whether a run is visible to the caller's company.

test("with no caller orgId, every run is visible (unfenced: CLI / gate / restore)", () => {
  assert.equal(runOwnedByOrg({ orgId: "org-A" }, undefined), true);
  assert.equal(runOwnedByOrg({ orgId: "org-A" }, null), true);
  assert.equal(runOwnedByOrg({ orgId: null }, undefined), true);
});

test("a company sees its own runs and only its own", () => {
  assert.equal(runOwnedByOrg({ orgId: "org-A" }, "org-A"), true);
  assert.equal(runOwnedByOrg({ orgId: "org-B" }, "org-A"), false);
});

test("a run with no company is invisible to any real company (pre-auth / anonymous)", () => {
  assert.equal(runOwnedByOrg({ orgId: null }, "org-A"), false);
  assert.equal(runOwnedByOrg({}, "org-A"), false);
});

test("a non-object state is never owned by a real company", () => {
  assert.equal(runOwnedByOrg(null, "org-A"), false);
  assert.equal(runOwnedByOrg("nope", "org-A"), false);
});

// runOwnedByUser is the member data wall (member-nav Phase 2): a member only ever sees
// runs they created — and unlike the org wall it is NEVER unfenced.
test("a member sees their own runs and only their own", () => {
  assert.equal(runOwnedByUser({ userId: "u1" }, "u1"), true);
  assert.equal(runOwnedByUser({ userId: "u2" }, "u1"), false);
});

test("no caller userId matches nothing (members are never unfenced, unlike orgs)", () => {
  assert.equal(runOwnedByUser({ userId: "u1" }, undefined), false);
  assert.equal(runOwnedByUser({ userId: "u1" }, null), false);
});

test("a run with no userId is invisible to any member", () => {
  assert.equal(runOwnedByUser({ userId: null }, "u1"), false);
  assert.equal(runOwnedByUser({}, "u1"), false);
});

test("a non-object state is never owned by a member", () => {
  assert.equal(runOwnedByUser(null, "u1"), false);
  assert.equal(runOwnedByUser("nope", "u1"), false);
});

// runVisibleToCaller is the admin-console fence (manager-privacy wall): the org wall
// always applies; the user wall applies only when a caller userId is given. An internal
// admin passes null userId (org-wide view); a manager passes their own id and sees only
// runs they created — a colleague manager's run answers "unknown", same as a stranger.
test("with no caller userId the fence is the org wall alone (internal admin view)", () => {
  assert.equal(runVisibleToCaller({ orgId: "org-A", userId: "u1" }, "org-A", null), true);
  assert.equal(runVisibleToCaller({ orgId: "org-A", userId: "u2" }, "org-A", undefined), true);
  assert.equal(runVisibleToCaller({ orgId: "org-B", userId: "u1" }, "org-A", null), false, "org wall still applies");
});

test("with a caller userId only that user's runs are visible (manager fence)", () => {
  assert.equal(runVisibleToCaller({ orgId: "org-A", userId: "u1" }, "org-A", "u1"), true);
  assert.equal(runVisibleToCaller({ orgId: "org-A", userId: "u2" }, "org-A", "u1"), false, "a colleague manager's run is invisible");
  assert.equal(runVisibleToCaller({ orgId: "org-A", userId: null }, "org-A", "u1"), false, "an ownerless run is invisible to a fenced manager");
  assert.equal(runVisibleToCaller({ orgId: "org-B", userId: "u1" }, "org-A", "u1"), false, "both walls stack");
});

test("fully unfenced caller (CLI/gate) sees everything", () => {
  assert.equal(runVisibleToCaller({ orgId: "org-A", userId: "u1" }, null, null), true);
  assert.equal(runVisibleToCaller({}, null, null), true);
});

// memberRunVisible decides which of a member's own runs their list shows: finished runs
// always; a started-but-unfinished prep only when includeOpen is set AND it already names
// a person (Team groups on the name — a nameless prep has nothing to show).
test("a finished owned run is always visible, with or without includeOpen", () => {
  const state = { userId: "u1", briefing: { headline: "hi" }, ctx: { name: "Priya" } };
  assert.equal(memberRunVisible(state, "u1", false), true);
  assert.equal(memberRunVisible(state, "u1", true), true);
});

test("an open owned prep with a person name shows only when includeOpen is set", () => {
  const state = { userId: "u1", ctx: { name: "Darren" } };
  assert.equal(memberRunVisible(state, "u1", false), false);
  assert.equal(memberRunVisible(state, "u1", true), true);
});

test("an open prep with no name yet never shows — nothing to group on", () => {
  assert.equal(memberRunVisible({ userId: "u1", ctx: {} }, "u1", true), false);
  assert.equal(memberRunVisible({ userId: "u1", ctx: { name: "  " } }, "u1", true), false);
  assert.equal(memberRunVisible({ userId: "u1" }, "u1", true), false);
});

test("someone else's run is never visible, open or finished", () => {
  assert.equal(memberRunVisible({ userId: "u2", briefing: {}, ctx: { name: "P" } }, "u1", true), false);
  assert.equal(memberRunVisible({ userId: "u2", ctx: { name: "P" } }, "u1", true), false);
});

// cloneRunState is the pure half of the dev-only "prefill a run" tool: it takes a
// finished run's state and stamps a fresh identity + the caller's owner onto a copy,
// so the clone lands in the caller's own /mine list. The I/O (mint dir, copy folder)
// is the thin cloneRun wrapper; this is the logic worth pinning down.
test("cloneRunState stamps a new identity + caller owner and keeps the briefing", () => {
  const source = {
    id: "SRC", dir: "/logs/june/SRC", orgId: "org-src", userId: "someone-else",
    createdAt: 1, lastSeenAt: 2, completedAt: 3,
    briefing: { headline: "hi" }, ctx: { name: "Priya" }, turn: 8,
  };
  const out = cloneRunState(source, {
    id: "NEW", dir: "/logs/july/NEW", orgId: "dev-org", userId: "dev-user", now: 999,
  });
  assert.equal(out.id, "NEW");
  assert.equal(out.dir, "/logs/july/NEW");
  assert.equal(out.orgId, "dev-org"); // caller's company — so it's visible to them
  assert.equal(out.userId, "dev-user"); // caller owns the clone — so it shows in /mine
  assert.equal(out.createdAt, 999);
  assert.equal(out.lastSeenAt, 999);
  assert.equal(out.completedAt, 999);
  assert.equal(out.runLabel, "prefill"); // identifiable as a prefilled run
  assert.deepEqual(out.briefing, { headline: "hi" }); // the whole point: keep the result
  assert.deepEqual(out.ctx, { name: "Priya" });
  assert.equal(out.turn, 8);
});

test("cloneRunState does not mutate the source run", () => {
  const source = { id: "SRC", orgId: "org-src", userId: "someone-else", briefing: { x: 1 } };
  cloneRunState(source, { id: "NEW", dir: "/d", orgId: "o", userId: "u", now: 5 });
  assert.equal(source.id, "SRC");
  assert.equal(source.orgId, "org-src");
  assert.equal(source.userId, "someone-else");
});

// promiseHistoryOf (Promises loop phase 3): the manager-confirmed agreements a finished
// run carries, projected for the read-only member surfaces (person page + run detail) with
// their check-in outcome. The internal `at` timestamp is dropped; null when a run armed no loop.
test("promiseHistoryOf projects promises with their outcome, dropping the internal timestamp", () => {
  const state = {
    promises: [
      { id: "p1", owner: "manager", action: "revisit workload", when: "this week", outcome: "no", at: 123 },
      { id: "p2", owner: "report", action: "share the deck", when: "today", outcome: null, at: 456 },
    ],
  };
  assert.deepEqual(promiseHistoryOf(state), [
    { id: "p1", owner: "manager", action: "revisit workload", when: "this week", outcome: "no" },
    { id: "p2", owner: "report", action: "share the deck", when: "today", outcome: null },
  ]);
});

test("promiseHistoryOf is null when the loop was never armed (absent / empty / malformed)", () => {
  assert.equal(promiseHistoryOf({}), null, "no promises field");
  assert.equal(promiseHistoryOf({ promises: null }), null);
  assert.equal(promiseHistoryOf({ promises: [] }), null, "empty list surfaces nothing");
  assert.equal(promiseHistoryOf(null), null);
  assert.equal(promiseHistoryOf("nope"), null);
});

test("promiseHistoryOf skips malformed rows but keeps the well-formed ones", () => {
  const state = { promises: [{ id: "p1", owner: "manager", action: "do the thing", when: "today", outcome: "yes", at: 1 }, null, { action: "no id" }] };
  assert.deepEqual(promiseHistoryOf(state), [
    { id: "p1", owner: "manager", action: "do the thing", when: "today", outcome: "yes" },
  ]);
});

// personaTagOf feeds the Test-engine hub: which persona a run came from + whether
// it was scripted. Library rows spread it in, so the hub can group runs by persona.
test("personaTagOf reads the persona id and mode off saved state", () => {
  const state = { mode: "scripted", fingerprint: { personaId: "maya-chen", scriptVersion: "v2-plain" } };
  assert.deepEqual(personaTagOf(state), { personaId: "maya-chen", mode: "scripted" });
});

test("personaTagOf defaults a manual / legacy run to {null, manual}", () => {
  assert.deepEqual(personaTagOf({}), { personaId: null, mode: "manual" });
  assert.deepEqual(personaTagOf({ fingerprint: null }), { personaId: null, mode: "manual" });
  assert.deepEqual(personaTagOf(null), { personaId: null, mode: "manual" });
});

// overviewFields (manager-friendly session overview): person / role / meeting type,
// the manager's own INTAKE note (ctx.notes — not the in-meeting notes), and how far
// questioning got. Assembled once so the file + DB summarize paths can't drift.
test("overviewFields reads person, role and meeting type off ctx, note off ctx.notes", () => {
  const f = overviewFields({
    ctx: { name: "Carl", role: "UX Designer", seniority: "Mid", meetingType: "Bi-weekly check-in", notes: "Been quieter than usual in standups." },
  });
  assert.equal(f.person, "Carl");
  assert.equal(f.roleLine, "Mid UX Designer");
  assert.equal(f.meetingType, "Bi-weekly check-in");
  assert.equal(f.intakeNote, "Been quieter than usual in standups.");
  assert.equal(f.progress, null, "no budget yet → no question progress");
});

test("overviewFields reports question progress once a run reached questioning (answered of total)", () => {
  const f = overviewFields({ ctx: { name: "Priya" }, transcript: [{}, {}, {}, {}], turn: 4, totalBudget: 8 });
  assert.deepEqual(f.progress, { answered: 4, total: 8 });
});

test("overviewFields falls back to turn for the answered count, and truncates a long note", () => {
  const f = overviewFields({ ctx: { notes: "x".repeat(400) }, turn: 2, totalBudget: 8 });
  assert.deepEqual(f.progress, { answered: 2, total: 8 }, "no transcript → count off turn");
  assert.ok(f.intakeNote.length <= 160 && f.intakeNote.endsWith("…"), "long note is truncated");
});

test("overviewFields is safe on an empty / nameless state", () => {
  assert.deepEqual(overviewFields({}), { person: "", roleLine: "", meetingType: "", intakeNote: "", progress: null });
  assert.deepEqual(overviewFields(null), { person: "", roleLine: "", meetingType: "", intakeNote: "", progress: null });
});

test("overviewFields does not repeat the seniority word when the role already leads with it", () => {
  assert.equal(overviewFields({ ctx: { seniority: "Junior", role: "Junior Product Designer" } }).roleLine, "Junior Product Designer");
  assert.equal(overviewFields({ ctx: { seniority: "Senior", role: "Senior Nurse" } }).roleLine, "Senior Nurse");
  // Distinct words still combine as before.
  assert.equal(overviewFields({ ctx: { seniority: "Mid", role: "UX Designer" } }).roleLine, "Mid UX Designer");
  // Only-seniority / only-role degrade cleanly.
  assert.equal(overviewFields({ ctx: { seniority: "Lead", role: "" } }).roleLine, "Lead");
  assert.equal(overviewFields({ ctx: { seniority: "", role: "Nurse" } }).roleLine, "Nurse");
});
