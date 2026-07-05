import { test } from "node:test";
import assert from "node:assert/strict";
import { createSuperadminService } from "./superadmin.service.ts";
import type { SuperadminRepo, OrgRow, UserRow, RunRow, UserRunRow, SuperadminRunDetail } from "./superadmin.repo.ts";
import type { SuperadminAuditEntry } from "../../middleware/superadmin-audit.ts";

// A storage-agnostic fake — the service logic (grouping, ordering, the read-only view
// shape) is proven without a database, the same seam the other domains use.
function fakeRepo(
  orgs: OrgRow[],
  people: UserRow[],
  runs: RunRow[] = [],
  runsByUser: Record<string, UserRunRow[]> = {},
  runsById: Record<string, SuperadminRunDetail> = {},
  writes: { id: string; role: string }[] = [],
  deactivations: { id: string; at: Date | null }[] = [],
  revocations: string[] = [],
): SuperadminRepo {
  return {
    listOrganizations: async () => orgs,
    listUsers: async () => people,
    listRuns: async () => runs,
    listRunsForUser: async (id: string) => runsByUser[id] ?? [],
    readRun: async (id: string) => runsById[id] ?? null,
    updateUserRole: async (id, role) => { writes.push({ id, role }); },
    setDeactivated: async (id, at) => {
      deactivations.push({ id, at });
      const u = people.find((p) => p.id === id);
      if (u) u.deactivatedAt = at;
    },
    revokeSessionsForUser: async (id) => { revocations.push(id); },
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
    { id: "u3", orgId: "o2", name: "Cara", email: "cara@beta.com", role: "manager", createdAt: new Date("2026-02-02") },
    { id: "u1", orgId: "o1", name: "Ann", email: "ann@acme.com", role: "manager", createdAt: new Date("2026-01-02") },
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
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "manager", createdAt: new Date("2026-01-02") },
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
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "manager", createdAt: new Date("2026-01-02") },
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
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "manager", createdAt: new Date("2026-01-02") },
  ];
  const ann = (await oneOrg(users, []).listRegistered(NOW)).companies[0]!.users[0]!;
  assert.equal(ann.runCount, 0);
  assert.equal(ann.lastActiveAt, null);
  assert.equal(ann.runsThisWeek, 0);
  assert.equal(ann.runsLastWeek, 0);
});

test("enrich: alpha-wide rating summary (avg / rated / low ≤2) over all runs", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "manager", createdAt: new Date("2026-01-02") },
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

// --- PG8 Step 03: the read-only briefing detail --------------------------

test("runDetail: returns one finished run's read-only briefing", async () => {
  const detail: SuperadminRunDetail = {
    id: "r1",
    headline: "Marco 1:1",
    ctx: { name: "Marco", role: "Engineer", seniority: "Senior", meetingType: "One-on-one" },
    briefing: { summary_bullets: ["stood out"] },
    lastSeenAt: 1000,
    completedAt: 1000,
    rating: { stars: 4, note: "", updatedAt: null },
  };
  const svc = createSuperadminService(fakeRepo([], [], [], {}, { r1: detail }));
  assert.equal((await svc.runDetail("r1"))?.id, "r1");
});

test("runDetail: an unknown/unfinished run → null (controller turns this into a 404)", async () => {
  const svc = createSuperadminService(fakeRepo([], [], [], {}, {}));
  assert.equal(await svc.runDetail("nope"), null);
});

// --- user-management Phase 2: change a user's role -----------------------

const ACTOR = { userId: "super1", email: "carl@seroteams.com" };
function person(id: string, orgId: string, role: string): UserRow {
  return { id, orgId, name: id, email: `${id}@x.com`, role, createdAt: new Date("2026-01-01") };
}
function roleHarness(people: UserRow[]) {
  const writes: { id: string; role: string }[] = [];
  const audits: SuperadminAuditEntry[] = [];
  const svc = createSuperadminService(fakeRepo([], people, [], {}, {}, writes), async (e) => { audits.push(e); });
  return { svc, writes, audits };
}

test("setUserRole: promotes member → manager, writes it, audits success", async () => {
  const { svc, writes, audits } = roleHarness([person("u1", "o1", "admin"), person("u2", "o1", "member")]);
  const res = await svc.setUserRole(ACTOR, "u2", "manager");
  assert.deepEqual(res, { id: "u2", role: "manager" });
  assert.deepEqual(writes, [{ id: "u2", role: "manager" }]);
  assert.equal(audits.at(-1)?.outcome, "success");
  assert.equal(audits.at(-1)?.target, "u2");
});

test("setUserRole: rejects an invalid role (400), no write, audits failed", async () => {
  const { svc, writes, audits } = roleHarness([person("u1", "o1", "member")]);
  await assert.rejects(() => svc.setUserRole(ACTOR, "u1", "superuser"), /role/i);
  assert.deepEqual(writes, []);
  assert.equal(audits.at(-1)?.outcome, "failed");
});

test("setUserRole: unknown user → 404, no write, audits failed", async () => {
  const { svc, writes, audits } = roleHarness([]);
  await assert.rejects(() => svc.setUserRole(ACTOR, "ghost", "manager"), /unknown user/);
  assert.deepEqual(writes, []);
  assert.equal(audits.at(-1)?.outcome, "failed");
});

test("setUserRole: blocks demoting the company's only manager/admin (409), no write, audits blocked", async () => {
  const { svc, writes, audits } = roleHarness([person("u1", "o1", "manager"), person("u2", "o1", "member")]);
  await assert.rejects(() => svc.setUserRole(ACTOR, "u1", "member"), /only manager or admin/i);
  assert.deepEqual(writes, []);
  assert.equal(audits.at(-1)?.outcome, "blocked");
});

test("setUserRole: allows demoting a lead when another manager/admin remains", async () => {
  const { svc, writes, audits } = roleHarness([person("u1", "o1", "manager"), person("u2", "o1", "admin")]);
  const res = await svc.setUserRole(ACTOR, "u1", "member");
  assert.deepEqual(res, { id: "u1", role: "member" });
  assert.deepEqual(writes, [{ id: "u1", role: "member" }]);
  assert.equal(audits.at(-1)?.outcome, "success");
});

// --- Deactivate / reactivate (user-management Phase 3) ---

function deactivateHarness(people: UserRow[]) {
  const deactivations: { id: string; at: Date | null }[] = [];
  const revocations: string[] = [];
  const audits: SuperadminAuditEntry[] = [];
  const svc = createSuperadminService(
    fakeRepo([], people, [], {}, {}, [], deactivations, revocations),
    async (e) => { audits.push(e); },
  );
  return { svc, deactivations, revocations, audits };
}
function deactivated(id: string, orgId: string, role: string): UserRow {
  return { ...person(id, orgId, role), deactivatedAt: new Date("2026-01-01") };
}

test("deactivateUser: switches a user off, kills their live sessions, audits success", async () => {
  // A second active lead so the last-lead guardrail doesn't fire.
  const { svc, deactivations, revocations, audits } = deactivateHarness([
    person("u1", "o1", "admin"),
    person("u2", "o1", "member"),
  ]);
  const res = await svc.deactivateUser(ACTOR, "u2");
  assert.deepEqual(res, { id: "u2", deactivated: true });
  assert.equal(deactivations.length, 1);
  assert.equal(deactivations[0]?.id, "u2");
  assert.ok(deactivations[0]?.at instanceof Date, "a timestamp is written, not null");
  assert.deepEqual(revocations, ["u2"], "live sessions are revoked (kicked now)");
  assert.equal(audits.at(-1)?.outcome, "success");
  assert.equal(audits.at(-1)?.target, "u2");
});

test("reactivateUser: clears the block, audits success, no session touch", async () => {
  const { svc, deactivations, revocations, audits } = deactivateHarness([deactivated("u1", "o1", "member")]);
  const res = await svc.reactivateUser(ACTOR, "u1");
  assert.deepEqual(res, { id: "u1", deactivated: false });
  assert.deepEqual(deactivations, [{ id: "u1", at: null }]);
  assert.deepEqual(revocations, [], "reactivation never revokes sessions");
  assert.equal(audits.at(-1)?.outcome, "success");
});

test("deactivateUser: unknown user → 404, no write, audits failed", async () => {
  const { svc, deactivations, revocations, audits } = deactivateHarness([]);
  await assert.rejects(() => svc.deactivateUser(ACTOR, "ghost"), /unknown user/);
  assert.deepEqual(deactivations, []);
  assert.deepEqual(revocations, []);
  assert.equal(audits.at(-1)?.outcome, "failed");
});

test("deactivateUser: blocks deactivating yourself (409), no write, audits blocked", async () => {
  // ACTOR is super1 — put them in the roster and try to deactivate self.
  const { svc, deactivations, audits } = deactivateHarness([
    person("super1", "o1", "admin"),
    person("u2", "o1", "admin"),
  ]);
  await assert.rejects(() => svc.deactivateUser(ACTOR, "super1"), /your own account/i);
  assert.deepEqual(deactivations, []);
  assert.equal(audits.at(-1)?.outcome, "blocked");
});

test("deactivateUser: blocks deactivating a superadmin account (409)", async () => {
  const prev = process.env.SUPERADMIN_EMAILS;
  process.env.SUPERADMIN_EMAILS = "boss@x.com"; // person('boss',…).email === 'boss@x.com'
  try {
    const { svc, deactivations, audits } = deactivateHarness([
      person("boss", "o1", "admin"),
      person("u2", "o1", "admin"),
    ]);
    await assert.rejects(() => svc.deactivateUser(ACTOR, "boss"), /superadmin account/i);
    assert.deepEqual(deactivations, []);
    assert.equal(audits.at(-1)?.outcome, "blocked");
  } finally {
    process.env.SUPERADMIN_EMAILS = prev;
  }
});

test("deactivateUser: blocks deactivating a company's only active lead (409)", async () => {
  const { svc, deactivations, revocations, audits } = deactivateHarness([
    person("u1", "o1", "manager"),
    person("u2", "o1", "member"),
  ]);
  await assert.rejects(() => svc.deactivateUser(ACTOR, "u1"), /only active manager or admin/i);
  assert.deepEqual(deactivations, []);
  assert.deepEqual(revocations, []);
  assert.equal(audits.at(-1)?.outcome, "blocked");
});

test("deactivateUser: allows deactivating a lead when another ACTIVE lead remains", async () => {
  const { svc, deactivations, audits } = deactivateHarness([
    person("u1", "o1", "manager"),
    person("u2", "o1", "admin"),
  ]);
  const res = await svc.deactivateUser(ACTOR, "u1");
  assert.deepEqual(res, { id: "u1", deactivated: true });
  assert.equal(deactivations[0]?.id, "u1");
  assert.equal(audits.at(-1)?.outcome, "success");
});
