import { test } from "node:test";
import assert from "node:assert/strict";
import { createSuperadminService } from "./superadmin.service.ts";
import type { SuperadminRepo, OrgRow, UserRow, RunRow, UserRunRow, SuperadminRunDetail, PulseRunRow, PulseFeedbackRow, AdminRunRow } from "./superadmin.repo.ts";
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
  guestRuns: UserRunRow[] = [],
  deletions: string[] = [],
  rosterCounts: Record<string, number> = {},
  pulseRuns: PulseRunRow[] = [],
  errorCounts: { total: number; unresolved: number } = { total: 0, unresolved: 0 },
  feedback: PulseFeedbackRow[] = [],
  adminRuns: AdminRunRow[] = [],
): SuperadminRepo {
  return {
    listOrganizations: async () => orgs,
    listUsers: async () => people,
    listRuns: async () => runs,
    listRunsForUser: async (id: string) => runsByUser[id] ?? [],
    listGuestRuns: async () => guestRuns,
    readRun: async (id: string) => runsById[id] ?? null,
    listPulseRuns: async () => pulseRuns,
    listAdminRuns: async () => adminRuns,
    countRecentErrors: async () => errorCounts,
    latestFeedback: async (limit: number) => feedback.slice(0, limit),
    updateUserRole: async (id, role) => { writes.push({ id, role }); },
    setDeactivated: async (id, at) => {
      deactivations.push({ id, at });
      const u = people.find((p) => p.id === id);
      if (u) u.deactivatedAt = at;
    },
    revokeSessionsForUser: async (id) => { revocations.push(id); },
    managedRosterCount: async (id) => rosterCounts[id] ?? 0,
    deleteUser: async (id) => {
      deletions.push(id);
      const i = people.findIndex((p) => p.id === id);
      if (i >= 0) people.splice(i, 1);
    },
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

test("pulse folds the Gate-1 number, week counts and the time-series from one dataset", async () => {
  const NOW = new Date("2026-07-12T12:00:00.000Z");
  const nowMs = NOW.getTime();
  const DAY = 24 * 60 * 60 * 1000;

  const orgs: OrgRow[] = [
    { id: "acme", name: "Acme", createdAt: new Date("2026-06-01") },
    { id: "sero", name: "Sero", createdAt: new Date("2026-05-01") },
  ];
  const people: UserRow[] = [
    { id: "ann",  orgId: "acme", name: "Ann",  email: "ann@acme.com",       role: "manager", createdAt: new Date("2026-06-02") },
    { id: "bo",   orgId: "acme", name: "Bo",   email: "bo@acme.com",        role: "manager", createdAt: new Date("2026-06-03") },
    { id: "cara", orgId: "acme", name: "Cara", email: "cara@acme.com",      role: "member",  createdAt: new Date("2026-06-04") },
    { id: "carl", orgId: "sero", name: "Carl", email: "carl@seroteams.com", role: "admin",   createdAt: new Date("2026-05-02") },
  ];
  // Runs that drive listRegistered's came-back + week tallies (createdAt = start, in ms).
  const runs: RunRow[] = [
    { userId: "ann",  createdAt: nowMs - 10 * DAY, lastSeenAt: nowMs - 10 * DAY, stars: 5 },
    { userId: "ann",  createdAt: nowMs - 2 * DAY,  lastSeenAt: nowMs - 2 * DAY,  stars: 4 },
    { userId: "bo",   createdAt: nowMs - 5 * DAY,  lastSeenAt: nowMs - 5 * DAY,  stars: null },
    { userId: "carl", createdAt: nowMs - 1 * DAY,  lastSeenAt: nowMs - 1 * DAY,  stars: 4 },
  ];
  // Time-series rows: Carl (internal) and the ownerless guest row must both be excluded.
  const pulseRuns: PulseRunRow[] = [
    { userId: "ann",  orgId: "acme", createdAtMs: nowMs - 2 * DAY,  meetingType: "biweekly", stage: "briefing",  finished: true },
    { userId: "ann",  orgId: "acme", createdAtMs: nowMs - 10 * DAY, meetingType: "first",    stage: "briefing",  finished: true },
    { userId: "bo",   orgId: "acme", createdAtMs: nowMs - 5 * DAY,  meetingType: "biweekly", stage: "questions", finished: false },
    { userId: "carl", orgId: "sero", createdAtMs: nowMs - 1 * DAY,  meetingType: "weekly",   stage: "briefing",  finished: true },
    { userId: null,   orgId: null,   createdAtMs: nowMs - 1 * DAY,  meetingType: "first",    stage: "questions", finished: false },
  ];
  const guests: UserRunRow[] = [userRun("g1", "Guest A", nowMs - 3 * DAY, null), userRun("g2", "Guest B", nowMs - 4 * DAY, 5)];
  const feedback: PulseFeedbackRow[] = [{ message: "Exactly the question I needed.", verdict: "yes", runId: "ann-2", createdAtMs: nowMs - 2 * DAY }];

  const svc = createSuperadminService(
    fakeRepo(orgs, people, runs, {}, {}, [], [], [], guests, [], {}, pulseRuns, { total: 1, unresolved: 0 }, feedback),
  );
  const p = await svc.pulse(NOW);

  assert.deepEqual(p.gate1, { cameBack: 1, total: 2 });   // Ann + Bo tried; only Ann came back
  assert.equal(p.managersOnLive, 2);                       // Ann + Bo (Cara is a member; Carl internal)
  assert.equal(p.runsThisWeek, 2);                         // Ann day-2 + Bo day-5
  assert.equal(p.runsLastWeek, 1);                         // Ann day-10
  assert.equal(p.guestCount, 2);
  assert.deepEqual(p.errors, { total: 1, unresolved: 0 });
  assert.equal(p.latestFeedback.length, 1);
  assert.equal(p.latestFeedback[0]!.verdict, "yes");

  // The time-series drops internal (Carl) + guest (ownerless) runs.
  assert.equal(p.runsPerDay.length, 14);
  assert.equal(p.runsPerDay.reduce((a, b) => a + b, 0), 3);           // ann×2 + bo×1
  assert.deepEqual(p.runTypeMix, [{ type: "biweekly", count: 2 }]);   // last 7d only (ann day-10 drops out)
  assert.deepEqual(p.dropOffs, [{ stage: "questions", count: 1 }]);   // bo's unfinished run
});

test("pulse lists managers newest sign-up first, so a fresh registration leads the card", async () => {
  const NOW = new Date("2026-07-21T12:00:00.000Z");
  // The service reads companies oldest-first; without the re-sort the newest manager renders
  // last (below the card's fold). Nadia registered today with zero runs — she must still lead.
  const orgs: OrgRow[] = [
    { id: "oldco", name: "Old Co", createdAt: new Date("2026-06-01") },
    { id: "newco", name: "New Co", createdAt: new Date("2026-07-20") },
  ];
  const people: UserRow[] = [
    { id: "old", orgId: "oldco", name: "Olive", email: "olive@oldco.com", role: "manager", createdAt: new Date("2026-06-02") },
    { id: "mid", orgId: "oldco", name: "Milo",  email: "milo@oldco.com",  role: "manager", createdAt: new Date("2026-07-01") },
    { id: "new", orgId: "newco", name: "Nadia", email: "nadia@newco.com", role: "manager", createdAt: new Date("2026-07-20") },
  ];

  const p = await createSuperadminService(fakeRepo(orgs, people)).pulse(NOW);

  assert.deepEqual(p.managers.map((m) => m.id), ["new", "mid", "old"]); // newest → oldest sign-up
  assert.equal(p.managersOnLive, 3);                                    // re-sort drops no one
});

// --- pulse-drilldowns: the cross-company run list ------------------------

test("adminRuns: joins owner + company, labels internal and guest, newest-first, tile-rule week count", async () => {
  const NOW = new Date("2026-07-12T12:00:00.000Z");
  const nowMs = NOW.getTime();
  const DAY = 24 * 60 * 60 * 1000;

  const orgs: OrgRow[] = [
    { id: "acme", name: "Acme", createdAt: new Date("2026-06-01") },
    { id: "sero", name: "Sero", createdAt: new Date("2026-05-01") },
  ];
  const people: UserRow[] = [
    { id: "ann",  orgId: "acme", name: "Ann",  email: "ann@acme.com",       role: "manager", createdAt: new Date("2026-06-02") },
    { id: "carl", orgId: "sero", name: "Carl", email: "carl@seroteams.com", role: "admin",   createdAt: new Date("2026-05-02") },
  ];
  // The tile's own dataset (finished runs) — the week count must use ITS rule,
  // so the page header can never disagree with the Pulse card.
  const runs: RunRow[] = [
    { userId: "ann",  createdAt: nowMs - 1 * DAY,  lastSeenAt: nowMs - 1 * DAY,  stars: 5 },
    { userId: "ann",  createdAt: nowMs - 10 * DAY, lastSeenAt: nowMs - 10 * DAY, stars: null },
    { userId: "carl", createdAt: nowMs - 2 * DAY,  lastSeenAt: nowMs - 2 * DAY,  stars: 4 },
  ];
  const adminRunRows: AdminRunRow[] = [
    // Deliberately unordered — the service sorts newest-first by start time.
    { id: "r-ann-old", userId: "ann",  orgId: "acme", createdAtMs: nowMs - 10 * DAY, lastSeenAtMs: nowMs - 10 * DAY, meetingType: "first",    stage: "briefing",  finished: true,  rating: null },
    { id: "r-ann-new", userId: "ann",  orgId: "acme", createdAtMs: nowMs - 1 * DAY,  lastSeenAtMs: nowMs - 1 * DAY,  meetingType: "biweekly", stage: "briefing",  finished: true,  rating: { stars: 5, note: "spot on", updatedAt: null } },
    { id: "r-guest",   userId: null,   orgId: null,   createdAtMs: nowMs - 3 * DAY,  lastSeenAtMs: nowMs - 3 * DAY,  meetingType: "first",    stage: "questions", finished: false, rating: null },
    { id: "r-carl",    userId: "carl", orgId: "sero", createdAtMs: nowMs - 2 * DAY,  lastSeenAtMs: nowMs - 2 * DAY,  meetingType: "weekly",   stage: "briefing",  finished: true,  rating: { stars: 4, note: "", updatedAt: null } },
  ];

  const svc = createSuperadminService(
    fakeRepo(orgs, people, runs, {}, {}, [], [], [], [], [], {}, [], { total: 0, unresolved: 0 }, [], adminRunRows),
  );
  const { runs: list, externalThisWeek } = await svc.adminRuns(NOW);

  // Newest-first by start time.
  assert.deepEqual(list.map((r) => r.id), ["r-ann-new", "r-carl", "r-guest", "r-ann-old"]);

  const annRun = list[0]!;
  assert.equal(annRun.userName, "Ann");
  assert.equal(annRun.company, "Acme");
  assert.equal(annRun.internal, false);
  assert.equal(annRun.guest, false);
  assert.equal(annRun.rating?.stars, 5);
  assert.equal(annRun.rating?.note, "spot on");

  const carlRun = list[1]!;
  assert.equal(carlRun.internal, true, "seroteams.com accounts are labelled internal");
  assert.equal(carlRun.company, "Sero");

  const guestRun = list[2]!;
  assert.equal(guestRun.guest, true, "an ownerless run is labelled guest");
  assert.equal(guestRun.userName, null);
  assert.equal(guestRun.company, null);
  assert.equal(guestRun.finished, false);
  assert.equal(guestRun.stage, "questions");

  // Ann's day-1 run is inside the week; her day-10 run isn't; Carl is internal.
  assert.equal(externalThisWeek, 1);
});

test("adminRuns: no runs → empty list and a zero count, not an error", async () => {
  const svc = createSuperadminService(fakeRepo([], []));
  const res = await svc.adminRuns();
  assert.deepEqual(res.runs, []);
  assert.equal(res.externalThisWeek, 0);
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

// --- validation-kit Phase 2: the return signal ----------------------------
// firstRunAt / gapDays / cameBack answer "did this manager come back unprompted?"
// from run start times (createdAt, falling back to lastSeenAt for old rows).

test("return signal: two runs within 14 days → cameBack, with first-run date and gap", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "manager", createdAt: new Date("2026-01-02") },
  ];
  const runs: RunRow[] = [
    { userId: "u1", createdAt: ago(10), lastSeenAt: ago(10), stars: null },
    { userId: "u1", createdAt: ago(3), lastSeenAt: ago(3), stars: null },
  ];
  const ann = (await oneOrg(users, runs).listRegistered(NOW)).companies[0]!.users[0]!;
  assert.equal(ann.firstRunAt?.getTime(), ago(10));
  assert.equal(ann.gapDays, 7);
  assert.equal(ann.cameBack, true);
});

test("return signal: a single run → first-run date, no gap, no badge", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "manager", createdAt: new Date("2026-01-02") },
  ];
  const runs: RunRow[] = [{ userId: "u1", createdAt: ago(5), lastSeenAt: ago(5), stars: null }];
  const ann = (await oneOrg(users, runs).listRegistered(NOW)).companies[0]!.users[0]!;
  assert.equal(ann.firstRunAt?.getTime(), ago(5));
  assert.equal(ann.gapDays, null);
  assert.equal(ann.cameBack, false);
});

test("return signal: the second run past 14 days → gap shown but NOT cameBack", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "manager", createdAt: new Date("2026-01-02") },
  ];
  const runs: RunRow[] = [
    { userId: "u1", createdAt: ago(30), lastSeenAt: ago(30), stars: null },
    { userId: "u1", createdAt: ago(10), lastSeenAt: ago(10), stars: null },
  ];
  const ann = (await oneOrg(users, runs).listRegistered(NOW)).companies[0]!.users[0]!;
  assert.equal(ann.gapDays, 20);
  assert.equal(ann.cameBack, false);
});

test("return signal: only the FIRST two runs set the gap — a third run doesn't shrink it", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "manager", createdAt: new Date("2026-01-02") },
  ];
  const runs: RunRow[] = [
    // Unordered on purpose — the service must find the two earliest itself.
    { userId: "u1", createdAt: ago(2), lastSeenAt: ago(2), stars: null },
    { userId: "u1", createdAt: ago(40), lastSeenAt: ago(40), stars: null },
    { userId: "u1", createdAt: ago(20), lastSeenAt: ago(20), stars: null },
  ];
  const ann = (await oneOrg(users, runs).listRegistered(NOW)).companies[0]!.users[0]!;
  assert.equal(ann.firstRunAt?.getTime(), ago(40));
  assert.equal(ann.gapDays, 20); // 40 → 20 days ago, not 20 → 2
  assert.equal(ann.cameBack, false);
});

test("return signal: no createdAt on an old row → falls back to lastSeenAt", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "manager", createdAt: new Date("2026-01-02") },
  ];
  const runs: RunRow[] = [
    { userId: "u1", lastSeenAt: ago(9), stars: null }, // legacy row, no createdAt
    { userId: "u1", createdAt: ago(4), lastSeenAt: ago(4), stars: null },
  ];
  const ann = (await oneOrg(users, runs).listRegistered(NOW)).companies[0]!.users[0]!;
  assert.equal(ann.firstRunAt?.getTime(), ago(9));
  assert.equal(ann.gapDays, 5);
  assert.equal(ann.cameBack, true);
});

test("return signal: no runs → nulls and false, never fake dates", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Ann", email: "a@x.com", role: "manager", createdAt: new Date("2026-01-02") },
  ];
  const ann = (await oneOrg(users, []).listRegistered(NOW)).companies[0]!.users[0]!;
  assert.equal(ann.firstRunAt, null);
  assert.equal(ann.gapDays, null);
  assert.equal(ann.cameBack, false);
});

test("internal label: seroteams.com accounts are flagged so real testers stand out", async () => {
  const users: UserRow[] = [
    { id: "u1", orgId: "o1", name: "Carl", email: "carl@seroteams.com", role: "admin", createdAt: new Date("2026-01-02") },
    { id: "u2", orgId: "o1", name: "Real Tester", email: "x@customer.com", role: "manager", createdAt: new Date("2026-01-03") },
  ];
  const { companies } = await oneOrg(users, []).listRegistered(NOW);
  const [carl, tester] = companies[0]!.users;
  assert.equal(carl!.internal, true);
  assert.equal(tester!.internal, false);
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

// --- guest-run Phase 4: the ownerless guest pile --------------------------

test("guestRuns: returns the ownerless finished runs newest-first", async () => {
  const guests = [userRun("g1", "Alex", ago(5), null), userRun("g2", "Jordan", ago(1), null)];
  const svc = createSuperadminService(fakeRepo([], [], [], {}, {}, [], [], [], guests));
  const { runs } = await svc.guestRuns();
  assert.deepEqual(runs.map((r) => r.id), ["g2", "g1"]); // newest first
  assert.equal(runs[0]!.ctx.name, "Jordan");
});

test("guestRuns: no guest runs → empty list, not an error", async () => {
  const svc = createSuperadminService(fakeRepo([], []));
  assert.deepEqual((await svc.guestRuns()).runs, []);
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

// --- Delete a user (user-management Phase 4) ---
// Same guardrails as deactivate (self / superadmin / last active lead). The irreversible
// action, so it's the one behind a confirm; runs are kept-but-orphaned in the repo.

function deleteHarness(people: UserRow[], rosterCounts: Record<string, number> = {}) {
  const deletions: string[] = [];
  const audits: SuperadminAuditEntry[] = [];
  const svc = createSuperadminService(
    fakeRepo([], people, [], {}, {}, [], [], [], [], deletions, rosterCounts),
    async (e) => { audits.push(e); },
  );
  return { svc, deletions, audits };
}

test("deleteUser: removes the user, audits success", async () => {
  const { svc, deletions, audits } = deleteHarness([
    person("u1", "o1", "admin"),
    person("u2", "o1", "member"),
  ]);
  const res = await svc.deleteUser(ACTOR, "u2");
  assert.deepEqual(res, { id: "u2", deleted: true });
  assert.deepEqual(deletions, ["u2"]);
  assert.equal(audits.at(-1)?.outcome, "success");
  assert.equal(audits.at(-1)?.target, "u2");
});

test("deleteUser: unknown user → 404, no delete, audits failed", async () => {
  const { svc, deletions, audits } = deleteHarness([]);
  await assert.rejects(() => svc.deleteUser(ACTOR, "ghost"), /unknown user/);
  assert.deepEqual(deletions, []);
  assert.equal(audits.at(-1)?.outcome, "failed");
});

test("deleteUser: blocks deleting yourself (409), no delete, audits blocked", async () => {
  const { svc, deletions, audits } = deleteHarness([
    person("super1", "o1", "admin"),
    person("u2", "o1", "admin"),
  ]);
  await assert.rejects(() => svc.deleteUser(ACTOR, "super1"), /your own account/i);
  assert.deepEqual(deletions, []);
  assert.equal(audits.at(-1)?.outcome, "blocked");
});

test("deleteUser: blocks deleting a superadmin account (409)", async () => {
  const prev = process.env.SUPERADMIN_EMAILS;
  process.env.SUPERADMIN_EMAILS = "boss@x.com";
  try {
    const { svc, deletions, audits } = deleteHarness([
      person("boss", "o1", "admin"),
      person("u2", "o1", "admin"),
    ]);
    await assert.rejects(() => svc.deleteUser(ACTOR, "boss"), /superadmin account/i);
    assert.deepEqual(deletions, []);
    assert.equal(audits.at(-1)?.outcome, "blocked");
  } finally {
    process.env.SUPERADMIN_EMAILS = prev;
  }
});

test("deleteUser: blocks deleting a company's only active lead (409)", async () => {
  const { svc, deletions, audits } = deleteHarness([
    person("u1", "o1", "manager"),
    person("u2", "o1", "member"),
  ]);
  await assert.rejects(() => svc.deleteUser(ACTOR, "u1"), /only active manager or admin/i);
  assert.deepEqual(deletions, []);
  assert.equal(audits.at(-1)?.outcome, "blocked");
});

test("deleteUser: allows deleting a lead when another ACTIVE lead remains", async () => {
  const { svc, deletions, audits } = deleteHarness([
    person("u1", "o1", "manager"),
    person("u2", "o1", "admin"),
  ]);
  const res = await svc.deleteUser(ACTOR, "u1");
  assert.deepEqual(res, { id: "u1", deleted: true });
  assert.deepEqual(deletions, ["u1"]);
  assert.equal(audits.at(-1)?.outcome, "success");
});

test("deleteUser: blocks deleting a user who still manages a team roster (409)", async () => {
  // u1 manages 3 people; another admin keeps the org led. Blocked to avoid silently
  // destroying their roster (people.manager_id is a NOT NULL foreign key).
  const { svc, deletions, audits } = deleteHarness(
    [person("u1", "o1", "admin"), person("u2", "o1", "admin")],
    { u1: 3 },
  );
  await assert.rejects(() => svc.deleteUser(ACTOR, "u1"), /still manages/i);
  assert.deepEqual(deletions, []);
  assert.equal(audits.at(-1)?.outcome, "blocked");
});
