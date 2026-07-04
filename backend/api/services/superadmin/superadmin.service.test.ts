import { test } from "node:test";
import assert from "node:assert/strict";
import { createSuperadminService } from "./superadmin.service.ts";
import type { SuperadminRepo, OrgRow, UserRow, RunSignal } from "./superadmin.repo.ts";

// A storage-agnostic fake — the service logic (grouping, ordering, the return-visit
// signal, the alpha summary, the read-only view shape) is proven without a database or
// a runs folder, the same seam the other domains use.
function fakeRepo(orgs: OrgRow[], people: UserRow[], signals: RunSignal[] = []): SuperadminRepo {
  return {
    listOrganizations: async () => orgs,
    listUsers: async () => people,
    listRunSignals: async () => signals,
  };
}

// A fixed reference clock so the week buckets are deterministic.
const NOW = new Date("2026-07-04T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).getTime();

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
  const { companies } = await svc.listRegistered(NOW);

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
  const { companies } = await svc.listRegistered(NOW);
  assert.equal(companies.length, 1);
  assert.deepEqual(companies[0]!.users, []);
});

test("listRegistered: no companies → empty list + empty summary, not an error", async () => {
  const svc = createSuperadminService(fakeRepo([], []));
  const { companies, summary } = await svc.listRegistered(NOW);
  assert.deepEqual(companies, []);
  assert.deepEqual(summary, { avgStars: null, ratedCount: 0, lowCount: 0 });
});

test("listRegistered: per-user run count, last-active, and this-week/last-week buckets", async () => {
  const orgs: OrgRow[] = [{ id: "o1", name: "Acme", createdAt: new Date("2026-01-01") }];
  const people: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "ann@acme.com", role: "owner", createdAt: new Date("2026-01-02") },
    { id: "u2", orgId: "o1", name: "Bo", email: "bo@acme.com", role: "member", createdAt: new Date("2026-01-03") },
  ];
  const signals: RunSignal[] = [
    { userId: "u1", lastSeenAt: daysAgo(1), stars: 5 }, // this week
    { userId: "u1", lastSeenAt: daysAgo(3), stars: 4 }, // this week
    { userId: "u1", lastSeenAt: daysAgo(10), stars: 2 }, // last week
    { userId: "u2", lastSeenAt: daysAgo(20), stars: null }, // older than last week
    { userId: null, lastSeenAt: daysAgo(2), stars: 3 }, // anonymous — attaches to no user
  ];
  const svc = createSuperadminService(fakeRepo(orgs, people, signals));
  const { companies } = await svc.listRegistered(NOW);
  const [ann, bo] = companies[0]!.users;

  assert.equal(ann!.runCount, 3);
  assert.equal(ann!.runsThisWeek, 2);
  assert.equal(ann!.runsLastWeek, 1);
  assert.equal(ann!.lastActiveAt?.getTime(), daysAgo(1)); // most recent run

  assert.equal(bo!.runCount, 1);
  assert.equal(bo!.runsThisWeek, 0);
  assert.equal(bo!.runsLastWeek, 0);
  assert.equal(bo!.lastActiveAt?.getTime(), daysAgo(20));
});

test("listRegistered: a user with no runs → runCount 0, no last-active (not omitted)", async () => {
  const orgs: OrgRow[] = [{ id: "o1", name: "Acme", createdAt: new Date("2026-01-01") }];
  const people: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "ann@acme.com", role: "owner", createdAt: new Date("2026-01-02") },
  ];
  const svc = createSuperadminService(fakeRepo(orgs, people, []));
  const { companies } = await svc.listRegistered(NOW);
  const ann = companies[0]!.users[0]!;
  assert.equal(ann.runCount, 0);
  assert.equal(ann.runsThisWeek, 0);
  assert.equal(ann.runsLastWeek, 0);
  assert.equal(ann.lastActiveAt, null);
});

test("listRegistered: alpha summary folds all ratings (avg / rated count / low ≤2), across companies", async () => {
  const orgs: OrgRow[] = [{ id: "o1", name: "Acme", createdAt: new Date("2026-01-01") }];
  const people: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "ann@acme.com", role: "owner", createdAt: new Date("2026-01-02") },
  ];
  const signals: RunSignal[] = [
    { userId: "u1", lastSeenAt: daysAgo(1), stars: 5 },
    { userId: "u1", lastSeenAt: daysAgo(2), stars: 4 },
    { userId: "u2", lastSeenAt: daysAgo(3), stars: 2 }, // low, and userId not in the roster — still counts alpha-wide
    { userId: "u1", lastSeenAt: daysAgo(4), stars: 1 }, // low
    { userId: "u1", lastSeenAt: daysAgo(5), stars: null }, // unrated — not in the average
  ];
  const svc = createSuperadminService(fakeRepo(orgs, people, signals));
  const { summary } = await svc.listRegistered(NOW);
  assert.equal(summary.ratedCount, 4);
  assert.equal(summary.lowCount, 2);
  assert.equal(summary.avgStars, 3); // (5+4+2+1)/4
});
