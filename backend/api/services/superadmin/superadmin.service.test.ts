import { test } from "node:test";
import assert from "node:assert/strict";
import { createSuperadminService } from "./superadmin.service.ts";
import type { SuperadminRepo, OrgRow, UserRow, RunRow, UserRunRow } from "./superadmin.repo.ts";

// A storage-agnostic fake — the service logic (grouping, ordering, the read-only view
// shape) is proven without a database, the same seam the other domains use.
function fakeRepo(
  orgs: OrgRow[],
  people: UserRow[],
  runs: RunRow[] = [],
  runsByUser: Record<string, UserRunRow[]> = {},
): SuperadminRepo {
  return {
    listOrganizations: async () => orgs,
    listUsers: async () => people,
    listRuns: async () => runs,
    listRunsForUser: async (id: string) => runsByUser[id] ?? [],
  };
}

function userRun(id: string, name: string, lastSeenAt: number, stars: number | null): UserRunRow {
  return {
    id,
    headline: name,
    ctx: { name, role: "Engineer", seniority: "Senior", meetingType: "One-on-one" },
    lastSeenAt,
    rating: stars == null ? null : { stars, note: "", updatedAt: null },
  };
}

test("listRegistered groups users under their company, oldest-first, no secrets in the view", async () => {
  const orgs: OrgRow[] = [
    { id: "o2", name: "Beta", createdAt: new Date("2026-02-01") },
    { id: "o1", name: "Acme", createdAt: new Date("2026-01-01") },
  ];
  const people: UserRow[] = [
    { id: "u3", orgId: "o2", name: "Cara", email: "cara@beta.com", role: "owner", createdAt: new Date("2026-02-02") },
    { id: "u1", orgId: "o1", name: "Ann", email: "ann@acme.com", role: "owner", createdAt: new Date("2026-01-02") },
    { id: "u2", orgId: "o1", name: "Bo", email: "bo@acme.com", role: "member", createdAt: new Date("2026-01-03") },
  ];
  const svc = createSuperadminService(fakeRepo(orgs, people));
  const { companies } = await svc.listRegistered();

  // Oldest company first.
  assert.deepEqual(companies.map((c) => c.name), ["Acme", "Beta"]);
  // Users nested under the right company, oldest-first.
  assert.deepEqual(companies[0]!.users.map((u) => u.name), ["Ann", "Bo"]);
  assert.deepEqual(companies[1]!.users.map((u) => u.name), ["Cara"]);
  // No secret, no internal id leaks into the view.
  for (const c of companies) {
    for (const u of c.users) {
      assert.ok(!("passwordHash" in u), "passwordHash must never appear in the view");
      assert.ok(!("orgId" in u), "internal orgId is not part of the user view");
    }
  }
});

test("listRegistered: a company with no users yet still appears with an empty list", async () => {
  const svc = createSuperadminService(fakeRepo([{ id: "o1", name: "Solo", createdAt: new Date("2026-01-01") }], []));
  const { companies } = await svc.listRegistered();
  assert.equal(companies.length, 1);
  assert.deepEqual(companies[0]!.users, []);
});

test("listRegistered: no companies → empty list, not an error", async () => {
  const svc = createSuperadminService(fakeRepo([], []));
  const { companies } = await svc.listRegistered();
  assert.deepEqual(companies, []);
});

// --- PG7 Step 01: the return-visit signal ---------------------------------

const NOW = new Date("2026-07-04T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => NOW.getTime() - days * DAY;

function oneOrg(users: UserRow[], runs: RunRow[]) {
  const orgs: OrgRow[] = [{ id: "o1", name: "Acme", createdAt: new Date("2026-01-01") }];
  return createSuperadminService(fakeRepo(orgs, users, runs));
}

test("enrich: per-user run count and last-active from run timestamps", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "owner", createdAt: new Date("2026-01-02") },
  ];
  const runs: RunRow[] = [
    { userId: "u1", lastSeenAt: ago(1), stars: null },
    { userId: "u1", lastSeenAt: ago(9), stars: null },
    { userId: "u2-stranger", lastSeenAt: ago(1), stars: null }, // no matching user → ignored
    { userId: null, lastSeenAt: ago(1), stars: null }, // machine run → ignored
  ];
  const { companies } = await oneOrg(users, runs).listRegistered(NOW);
  const ann = companies[0]!.users[0]!;
  assert.equal(ann.runCount, 2);
  assert.equal(ann.lastActiveAt?.getTime(), ago(1)); // most-recent wins
});

test("enrich: this-week / last-week bucketing against a fixed now", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "owner", createdAt: new Date("2026-01-02") },
  ];
  const runs: RunRow[] = [
    { userId: "u1", lastSeenAt: ago(1), stars: null }, // this week
    { userId: "u1", lastSeenAt: ago(6), stars: null }, // this week
    { userId: "u1", lastSeenAt: ago(8), stars: null }, // last week
    { userId: "u1", lastSeenAt: ago(20), stars: null }, // older than both
  ];
  const ann = (await oneOrg(users, runs).listRegistered(NOW)).companies[0]!.users[0]!;
  assert.equal(ann.runsThisWeek, 2);
  assert.equal(ann.runsLastWeek, 1);
});

test("enrich: a user with no runs still appears with zeros, not omitted", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "owner", createdAt: new Date("2026-01-02") },
  ];
  const ann = (await oneOrg(users, []).listRegistered(NOW)).companies[0]!.users[0]!;
  assert.equal(ann.runCount, 0);
  assert.equal(ann.lastActiveAt, null);
  assert.equal(ann.runsThisWeek, 0);
  assert.equal(ann.runsLastWeek, 0);
});

test("enrich: alpha-wide rating summary (avg / rated / low ≤2) over all runs", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "owner", createdAt: new Date("2026-01-02") },
  ];
  const runs: RunRow[] = [
    { userId: "u1", lastSeenAt: ago(1), stars: 5 },
    { userId: "u1", lastSeenAt: ago(2), stars: 4 },
    { userId: "u1", lastSeenAt: ago(3), stars: 2 }, // low
    { userId: "u1", lastSeenAt: ago(4), stars: null }, // unrated → not counted
  ];
  const { summary } = await oneOrg(users, runs).listRegistered(NOW);
  assert.equal(summary.avgStars, 3.7); // (5+4+2)/3 = 3.666… → 3.7
  assert.equal(summary.ratedCount, 3);
  assert.equal(summary.lowCount, 1);
});

test("enrich: summary with no ratings → avgStars null, zero counts", async () => {
  const { summary } = await oneOrg([], []).listRegistered(NOW);
  assert.equal(summary.avgStars, null);
  assert.equal(summary.ratedCount, 0);
  assert.equal(summary.lowCount, 0);
});

// --- PG8 Step 01: the per-user drilldown read ----------------------------

test("userRuns: returns one user's runs newest-first", async () => {
  const runsByUser = {
    u1: [userRun("r1", "Marco", ago(3), 4), userRun("r2", "Priya", ago(1), 5)],
  };
  const svc = createSuperadminService(fakeRepo([], [], [], runsByUser));
  const { runs } = await svc.userRuns("u1");
  assert.deepEqual(runs.map((r) => r.id), ["r2", "r1"]); // newest first
  assert.equal(runs[0]!.rating?.stars, 5);
});

test("userRuns: an unknown user → empty list, not an error", async () => {
  const svc = createSuperadminService(fakeRepo([], [], [], {}));
  const { runs } = await svc.userRuns("nobody");
  assert.deepEqual(runs, []);
});
