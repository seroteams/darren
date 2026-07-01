import { test } from "node:test";
import assert from "node:assert/strict";
import { runOwnedByOrg, runOwnedByUser, cloneRunState } from "./run-history.ts";

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
