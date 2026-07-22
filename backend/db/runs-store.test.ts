// Fencing tests for the Postgres run reads (postgres-runtime-data Phase 3) —
// one per list variant, run WITHOUT a database: the SQL layer only pre-narrows,
// these pure filters are the wall (they delegate to the engine's own fence
// functions and re-check the authoritative state jsonb). Treat as security
// tests: a failure here is a privacy leak, not a formatting bug.

import test from "node:test";
import assert from "node:assert/strict";
import {
  fenceOrgRows,
  fenceMemberRows,
  fenceUserRows,
  fenceCallerRows,
  fenceAboutPersonRows,
  toMemberRow,
  toMemberView,
  toFinishedRow,
  type DbRun,
} from "./runs-store.ts";

function run(overrides: Partial<DbRun> & { state?: Record<string, unknown> }): DbRun {
  const state = {
    id: "r1",
    orgId: "org-a",
    userId: "user-1",
    briefing: { text: "done" },
    ctx: { name: "Priya", role: "Eng", seniority: "Senior", meetingType: "Bi-weekly check-in" },
    lastSeenAt: 100,
    ...overrides.state,
  };
  return {
    id: (state.id as string) ?? "r1",
    dir: "logs/july/" + state.id,
    state,
    review: null,
    rating: null,
    archived: false,
    lastSeenAt: (state.lastSeenAt as number) ?? 0,
    ...overrides,
    ...(overrides.state ? { state } : {}),
  };
}

test("org fence: opt-in — unfenced caller sees all, fenced caller only their org, anonymous runs invisible to real orgs", () => {
  const rows = [
    run({ state: { id: "a", orgId: "org-a" } }),
    run({ state: { id: "b", orgId: "org-b" } }),
    run({ state: { id: "anon", orgId: null } }),
  ];
  assert.equal(fenceOrgRows(rows, null).length, 3, "unfenced (CLI/gate) sees everything");
  assert.deepEqual(fenceOrgRows(rows, "org-a").map((r) => r.id), ["a"]);
  assert.deepEqual(fenceOrgRows(rows, "org-b").map((r) => r.id), ["b"]);
  assert.equal(fenceOrgRows(rows, "org-c").length, 0, "a stranger org sees nothing — including anonymous runs");
});

test("member fence: NEVER unfenced — no caller userId matches nothing; only own runs; org wall stacks", () => {
  const rows = [
    run({ state: { id: "mine", orgId: "org-a", userId: "user-1" } }),
    run({ state: { id: "colleague", orgId: "org-a", userId: "user-2" } }),
    run({ state: { id: "other-org", orgId: "org-b", userId: "user-1" } }),
    run({ state: { id: "ownerless", orgId: "org-a", userId: null } }),
  ];
  assert.equal(fenceMemberRows(rows, "org-a", null, false).length, 0, "no userId → nothing, ever");
  assert.equal(fenceMemberRows(rows, "org-a", undefined, false).length, 0);
  assert.deepEqual(fenceMemberRows(rows, "org-a", "user-1", false).map((r) => r.id), ["mine"]);
  assert.equal(fenceMemberRows(rows, "org-b", "user-2", false).length, 0, "cross wall never matches");
});

test("member fence includeOpen: unfinished prep shows only with a named person, and only the owner's", () => {
  const rows = [
    run({ state: { id: "open-named", orgId: "org-a", userId: "user-1", briefing: null, ctx: { name: "Sam" } } }),
    run({ state: { id: "open-nameless", orgId: "org-a", userId: "user-1", briefing: null, ctx: { name: "  " } } }),
    run({ state: { id: "open-other", orgId: "org-a", userId: "user-2", briefing: null, ctx: { name: "Kai" } } }),
  ];
  assert.equal(fenceMemberRows(rows, "org-a", "user-1", false).length, 0, "unfinished hidden without includeOpen");
  assert.deepEqual(fenceMemberRows(rows, "org-a", "user-1", true).map((r) => r.id), ["open-named"]);
});

test("user fence (superadmin drilldown): finished + owned by exactly that user; null userId → []", () => {
  const rows = [
    run({ state: { id: "u1-done", userId: "user-1" } }),
    run({ state: { id: "u1-open", userId: "user-1", briefing: null } }),
    run({ state: { id: "u2-done", userId: "user-2" } }),
    run({ state: { id: "machine", userId: null } }),
  ];
  assert.deepEqual(fenceUserRows(rows, "user-1").map((r) => r.id), ["u1-done"]);
  assert.equal(fenceUserRows(rows, null).length, 0);
  assert.equal(fenceUserRows(rows, undefined).length, 0);
});

test("caller fence (manager privacy wall): null userId = org-wide (internal admin); a userId narrows to own runs only", () => {
  const rows = [
    run({ state: { id: "mine", orgId: "org-a", userId: "user-1" } }),
    run({ state: { id: "colleague", orgId: "org-a", userId: "user-2" } }),
    run({ state: { id: "ownerless", orgId: "org-a", userId: null } }),
    run({ state: { id: "other-org", orgId: "org-b", userId: "user-1" } }),
  ];
  assert.deepEqual(fenceCallerRows(rows, "org-a", null).map((r) => r.id), ["mine", "colleague", "ownerless"], "internal admin: org wall only");
  assert.deepEqual(fenceCallerRows(rows, "org-a", "user-1").map((r) => r.id), ["mine"], "manager: own runs only — a colleague's run is invisible");
  assert.equal(fenceCallerRows(rows, "org-b", "user-2").length, 0, "both walls stack — right org, wrong owner matches nothing");
  assert.deepEqual(fenceCallerRows(rows, "org-b", "user-1").map((r) => r.id), ["other-org"], "a manager's runs follow them only inside their own org");
  assert.equal(fenceCallerRows(rows, null, null).length, 4, "fully unfenced (CLI/gate)");
});

test("about-person fence: org required, finished only, personId must be in the linked set", () => {
  const rows = [
    run({ state: { id: "about-me", orgId: "org-a", personId: "p1" } }),
    run({ state: { id: "about-someone-else", orgId: "org-a", personId: "p9" } }),
    run({ state: { id: "other-org", orgId: "org-b", personId: "p1" } }),
    run({ state: { id: "unfinished", orgId: "org-a", personId: "p1", briefing: null } }),
  ];
  assert.deepEqual(fenceAboutPersonRows(rows, "org-a", ["p1"]).map((r) => r.id), ["about-me"]);
  assert.equal(fenceAboutPersonRows(rows, null, ["p1"]).length, 0, "no org → nothing");
  assert.equal(fenceAboutPersonRows(rows, "org-a", []).length, 0, "no linked people → nothing");
});

test("rating column validation matches the sidecar rules: only a valid 1-5 shape surfaces", () => {
  const good = toMemberRow(run({ rating: { stars: 4, note: "useful", updatedAt: "2026-07-08T00:00:00Z" } }));
  assert.deepEqual(good.rating, { stars: 4, note: "useful", updatedAt: "2026-07-08T00:00:00Z" });
  const zero = toMemberRow(run({ rating: { stars: 0, note: "x" } }));
  assert.equal(zero.rating, null);
  const six = toMemberRow(run({ rating: { stars: 6 } }));
  assert.equal(six.rating, null);
});

test("finished row carries the same review badge inputs the file store derives", () => {
  const r = toFinishedRow(
    run({
      review: { marks: { role_aware: "pass", grounded: "fail" }, overall: "fix" },
      archived: true,
    }),
  );
  assert.equal(r.archived, true);
  assert.equal(r.overall, "fix");
  assert.equal(r.failedCount, 1);
  assert.equal(r.decided, 2);
  assert.equal(r.reviewStatus, "partial");
});

test("finished row carries the run's cost off the saved briefing, null when it predates tracking", () => {
  const priced = toFinishedRow(run({ state: { briefing: { text: "done", cost: { usd_total: 0.38, call_count: 9 } } } }));
  assert.deepEqual(priced.cost, { usd: 0.38, calls: 9 });
  const old = toFinishedRow(run({}));
  assert.equal(old.cost, null, "no cost block -> null, never a fake $0.00");
});

test("member view projects the transcript to turns — question, answer, skipped — and drops the internal note", () => {
  const view = toMemberView(
    run({
      state: {
        transcript: [
          { turn: 1, question: { alias: "q_one", name: "How's the workload?" }, answer: "Stretched thin", skipped: false, note: "[SHALLOW] internal planner note" },
          { turn: 2, question: { alias: "q_two", name: "Anything at home?" }, answer: "(skipped)", skipped: true, note: null },
        ],
      },
    }),
  );
  assert.deepEqual(view.turns, [
    // read is the derived 4-way tag; the [SHALLOW] note it was derived FROM stays internal.
    { alias: "q_one", name: "How's the workload?", answer: "Stretched thin", skipped: false, read: "thin" },
    { alias: "q_two", name: "Anything at home?", answer: "(skipped)", skipped: true, read: "skip" },
  ]);
  assert.ok(!JSON.stringify(view.turns).includes("internal planner note"), "the internal planner note never reaches the member");
});

test("member view returns turns: [] when the run captured no answers", () => {
  assert.deepEqual(toMemberView(run({ state: { transcript: [] } })).turns, []);
  assert.deepEqual(toMemberView(run({})).turns, [], "absent transcript → [] not undefined");
});

test("finished row carries the bare stars number — never the manager's note", () => {
  const rated = toFinishedRow(run({ rating: { stars: 4, note: "private words", updatedAt: "2026-07-10T00:00:00Z" } }));
  assert.equal(rated.rating, 4);
  assert.ok(!JSON.stringify(rated).includes("private words"), "the note stays out of the feed");
  assert.equal(toFinishedRow(run({ rating: null })).rating, null);
  assert.equal(toFinishedRow(run({ rating: { stars: 9 } })).rating, null, "malformed shapes surface as unrated");
});
