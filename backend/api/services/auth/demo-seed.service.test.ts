// Unit tests for the signup demo seed (demo-member phase 1) — all against fakes,
// no database. The one contract that matters most: seedDemoWorkspace NEVER throws
// or rejects, whatever fails inside — a broken seed must never break a signup.

import test from "node:test";
import assert from "node:assert/strict";
import type { Session } from "../../../shared/session.types.ts";
import { seedDemoWorkspace } from "./demo-seed.service.ts";
import type { DemoFixture, DemoSeedDeps } from "./demo-seed.service.ts";

const USER = { id: "11111111-1111-4111-8111-111111111111", orgId: "22222222-2222-4222-8222-222222222222" };
const NOW = 1_753_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function fixture(): DemoFixture {
  return {
    state: {
      id: "2026_Jun06_09-47-ca22707c",
      dir: "logs/june/2026_Jun06_09-47-ca22707c",
      orgId: "33333333-3333-4333-8333-333333333333",
      userId: "44444444-4444-4444-8444-444444444444",
      personId: "55555555-5555-4555-8555-555555555555",
      createdAt: 1_749_000_000_000,
      lastSeenAt: 1_749_000_000_000,
      completedAt: 1_749_000_000_000,
      ctx: { name: "Sofia", role: "Product Designer", seniority: "Mid", meetingType: "Bi-weekly check-in" },
      briefing: { headline: "Sofia is stretched thin", next_actions: [] },
      runLabel: "seed",
      transcript: [],
      turn: 6,
    },
    artifacts: [
      { stage: "01-focus-points", name: "response.json", kind: "json", content: { ok: true }, contentText: null },
      { stage: "", name: "transcript.json", kind: "json", content: [], contentText: null },
    ],
  };
}

/** A full fake dep set that records every call; override per test. */
function fakeDeps(overrides: Partial<DemoSeedDeps> = {}) {
  const calls = {
    personInserts: [] as Array<Record<string, unknown>>,
    upserts: [] as Session[],
    artifactInserts: [] as Array<{ toKey: string; orgId: string; rows: DemoFixture["artifacts"] }>,
  };
  const deps: DemoSeedDeps = {
    hasDb: () => true,
    loadFixture: () => fixture(),
    createSession: () => ({ id: "2026_Jul22_10-00-demo0001", dir: "logs/july/2026_Jul22_10-00-demo0001" }),
    insertPerson: async (fields) => {
      calls.personInserts.push(fields as unknown as Record<string, unknown>);
      return {
        id: "66666666-6666-4666-8666-666666666666",
        orgId: fields.orgId,
        managerId: fields.managerId,
        name: fields.name,
        role: fields.role ?? null,
        seniority: fields.seniority ?? null,
        userId: null,
        mergedIntoId: null,
        archivedAt: null,
        isDemo: true,
      };
    },
    upsertSession: async (s) => {
      calls.upserts.push(s);
    },
    insertArtifacts: async (rows, toKey, orgId) => {
      calls.artifactInserts.push({ rows, toKey, orgId });
    },
    now: () => NOW,
    ...overrides,
  };
  return { deps, calls };
}

test("happy path: person + run land under the new org, flagged demo, briefing verbatim", async () => {
  const { deps, calls } = fakeDeps();
  await seedDemoWorkspace(USER, deps);

  // The person row comes FROM the fixture's ctx (roster and briefing can never disagree).
  assert.equal(calls.personInserts.length, 1);
  const p = calls.personInserts[0]!;
  assert.equal(p.orgId, USER.orgId);
  assert.equal(p.managerId, USER.id);
  assert.equal(p.name, "Sofia");
  assert.equal(p.role, "Product Designer");
  assert.equal(p.seniority, "Mid");
  assert.equal(p.isDemo, true);

  // The run is re-owned, re-dated, and flagged; content stays untouched.
  assert.equal(calls.upserts.length, 1);
  const s = calls.upserts[0]!;
  assert.equal(s.id, "2026_Jul22_10-00-demo0001");
  assert.equal(s.orgId, USER.orgId);
  assert.equal(s.userId, USER.id);
  assert.equal(s.personId, "66666666-6666-4666-8666-666666666666");
  assert.equal(s.createdAt, NOW - 3 * DAY);
  assert.equal(s.lastSeenAt, NOW - 3 * DAY);
  assert.equal(s.completedAt, NOW - 3 * DAY);
  assert.equal(s.runLabel, "demo");
  assert.equal(s.isDemo, true);
  assert.deepEqual(s.briefing, fixture().state.briefing, "briefing is cloned verbatim — never rewritten");
  assert.deepEqual(s.ctx, fixture().state.ctx);

  // Artifacts follow the new session key under the new org.
  assert.equal(calls.artifactInserts.length, 1);
  assert.equal(calls.artifactInserts[0]!.toKey, s.id);
  assert.equal(calls.artifactInserts[0]!.orgId, USER.orgId);
  assert.equal(calls.artifactInserts[0]!.rows.length, 2);
});

test("no database configured: a clean no-op, fixture never read", async () => {
  let fixtureReads = 0;
  const { deps, calls } = fakeDeps({
    hasDb: () => false,
    loadFixture: () => {
      fixtureReads += 1;
      return fixture();
    },
  });
  await seedDemoWorkspace(USER, deps);
  assert.equal(fixtureReads, 0);
  assert.equal(calls.personInserts.length, 0);
});

test("non-uuid identity (synthetic dev ids) seeds nothing", async () => {
  const { deps, calls } = fakeDeps();
  await seedDemoWorkspace({ id: "dev-user", orgId: "dev-org" }, deps);
  await seedDemoWorkspace({ id: USER.id, orgId: "dev-org" }, deps);
  assert.equal(calls.personInserts.length, 0);
  assert.equal(calls.upserts.length, 0);
});

test("missing or unfinished fixture: seeds nothing, resolves quietly", async () => {
  const missing = fakeDeps({ loadFixture: () => null });
  await seedDemoWorkspace(USER, missing.deps);
  assert.equal(missing.calls.personInserts.length, 0);

  const unfinished = fakeDeps({
    loadFixture: () => {
      const f = fixture();
      delete (f.state as Record<string, unknown>).briefing;
      return f;
    },
  });
  await seedDemoWorkspace(USER, unfinished.deps);
  assert.equal(unfinished.calls.personInserts.length, 0);
});

test("a throwing dep never escapes: person insert fails → resolves, no run written", async () => {
  const { deps, calls } = fakeDeps({
    insertPerson: async () => {
      throw new Error("pg down");
    },
  });
  await assert.doesNotReject(() => seedDemoWorkspace(USER, deps));
  assert.equal(calls.upserts.length, 0);
  assert.equal(calls.artifactInserts.length, 0);
});

test("a rejecting upsert never escapes; a THROWING fixture loader never escapes", async () => {
  const rejecting = fakeDeps({
    upsertSession: async () => {
      throw new Error("pool starved");
    },
  });
  await assert.doesNotReject(() => seedDemoWorkspace(USER, rejecting.deps));

  const throwing = fakeDeps({
    loadFixture: () => {
      throw new Error("bad json");
    },
  });
  await assert.doesNotReject(() => seedDemoWorkspace(USER, throwing.deps));
  assert.equal(throwing.calls.personInserts.length, 0);
});
