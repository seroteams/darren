import { test } from "node:test";
import assert from "node:assert/strict";
import { createAboutMeService } from "./about-me.service.ts";

// "1:1s about me" (people-roster Phase 5): a member linked to a roster person sees the
// 1:1s ABOUT them — list-only (type + date + manager name), never notes/briefing/ratings
// (no-inference ruling). Deps injected, so no database or filesystem in the test.

const RUNS = [
  { id: "r1", meetingType: "Bi-weekly check-in", lastSeenAt: 300, completedAt: 300, userId: "mgr1" },
  { id: "r2", meetingType: "Growth & career plan", lastSeenAt: 100, completedAt: 100, userId: "ghost" },
];

function fakeDeps(over: Partial<Parameters<typeof createAboutMeService>[0]> = {}) {
  return {
    findByLinkedUser: async (userId: string, orgId: string) =>
      userId === "u-member" && orgId === "o1"
        ? [{ id: "p1" }, { id: "p2" }]
        : [],
    listRunsAboutPerson: (orgId: string, personIds: string[]) =>
      orgId === "o1" && personIds.includes("p1") ? RUNS : [],
    listOrgUsers: async () => [{ id: "mgr1", name: "Carl", email: "carl@seroteams.com" }],
    ...over,
  };
}

test("a linked member gets the runs about their people, with the manager's name", async () => {
  const out = await createAboutMeService(fakeDeps()).aboutMe("o1", "u-member");
  assert.equal(out.runs.length, 2);
  assert.deepEqual(out.runs[0], {
    id: "r1",
    meetingType: "Bi-weekly check-in",
    lastSeenAt: 300,
    completedAt: 300,
    managerName: "Carl",
  });
});

test("an unknown manager id degrades to a null name (never crashes the list)", async () => {
  const out = await createAboutMeService(fakeDeps()).aboutMe("o1", "u-member");
  assert.equal(out.runs[1]?.managerName, null);
});

test("the rows carry NOTHING sensitive — no notes, briefing, rating, or creator id", async () => {
  const out = await createAboutMeService(fakeDeps()).aboutMe("o1", "u-member");
  for (const r of out.runs) {
    assert.deepEqual(
      Object.keys(r as unknown as Record<string, unknown>).sort(),
      ["completedAt", "id", "lastSeenAt", "managerName", "meetingType"],
    );
  }
});

test("a member with no linked person gets an empty list, not an error", async () => {
  const out = await createAboutMeService(fakeDeps()).aboutMe("o1", "u-unlinked");
  assert.deepEqual(out.runs, []);
});

test("no org or user context → empty (guests can't probe)", async () => {
  const svc = createAboutMeService(fakeDeps());
  assert.deepEqual((await svc.aboutMe(null, "u-member")).runs, []);
  assert.deepEqual((await svc.aboutMe("o1", null)).runs, []);
});
