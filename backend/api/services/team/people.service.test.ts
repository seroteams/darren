import { test } from "node:test";
import assert from "node:assert/strict";
import { createPeopleService } from "./people.service.ts";
import type { PeopleRepo, PersonRow } from "./people.repo.ts";

// An in-memory repo proves the service logic is storage-agnostic — no real database
// in the test (the injected-boundary seam; mirrors feedback.service.test.ts).
function fakeRepo(seed: PersonRow[] = []): { repo: PeopleRepo; rows: PersonRow[] } {
  const rows: PersonRow[] = [...seed];
  let n = 0;
  return {
    repo: {
      listForManager: async (orgId, managerId) =>
        rows.filter((r) => r.orgId === orgId && r.managerId === managerId),
      findForManager: async (id, orgId, managerId) =>
        rows.find((r) => r.id === id && r.orgId === orgId && r.managerId === managerId) ?? null,
      insert: async (fields) => {
        const row: PersonRow = {
          id: `p${++n}`,
          userId: null,
          mergedIntoId: null,
          archivedAt: null,
          role: null,
          seniority: null,
          ...fields,
        };
        rows.push(row);
        return row;
      },
      update: async (id, patch) => {
        const row = rows.find((r) => r.id === id);
        if (row) Object.assign(row, patch);
      },
    },
    rows,
  };
}

function person(over: Partial<PersonRow>): PersonRow {
  return {
    id: "p0",
    orgId: "o1",
    managerId: "m1",
    name: "Priya Shah",
    role: "Senior Engineer",
    seniority: "Senior",
    userId: null,
    mergedIntoId: null,
    archivedAt: null,
    ...over,
  };
}

const CALLER = { orgId: "o1", managerId: "m1" };

test("list returns only the caller's active people (merged + archived excluded)", async () => {
  const { repo } = fakeRepo([
    person({ id: "a", name: "Ada" }),
    person({ id: "b", name: "Ben", mergedIntoId: "a" }),
    person({ id: "c", name: "Cleo", archivedAt: new Date() }),
    person({ id: "d", name: "Dev", managerId: "OTHER" }),
    person({ id: "e", name: "Eve", orgId: "OTHER" }),
  ]);
  const out = await createPeopleService(repo).list(CALLER.orgId, CALLER.managerId);
  assert.deepEqual(out.people.map((p) => p.id), ["a"]);
});

test("list sorts people by name", async () => {
  const { repo } = fakeRepo([
    person({ id: "z", name: "Zoe" }),
    person({ id: "a", name: "ada" }), // case-insensitive sort
    person({ id: "m", name: "Marco" }),
  ]);
  const out = await createPeopleService(repo).list(CALLER.orgId, CALLER.managerId);
  assert.deepEqual(out.people.map((p) => p.name), ["ada", "Marco", "Zoe"]);
});

test("create inserts a trimmed person for the caller", async () => {
  const { repo, rows } = fakeRepo();
  const out = await createPeopleService(repo).create(CALLER.orgId, CALLER.managerId, {
    name: "  Grace  ",
    role: " Product Design Lead ",
    seniority: " Lead ",
  });
  assert.equal(out.person.name, "Grace");
  assert.equal(out.person.role, "Product Design Lead");
  assert.equal(out.person.seniority, "Lead");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.orgId, "o1");
  assert.equal(rows[0]?.managerId, "m1");
});

test("create dedupes on normalized name against the caller's ACTIVE roster (returns existing, no new row)", async () => {
  const { repo, rows } = fakeRepo([person({ id: "a", name: "Priya Shah" })]);
  const service = createPeopleService(repo);
  const out = await service.create(CALLER.orgId, CALLER.managerId, { name: "  priya shah " });
  assert.equal(out.person.id, "a");
  assert.equal(rows.length, 1); // no duplicate
  // …but an archived or merged row does NOT block a fresh create
  const { repo: repo2, rows: rows2 } = fakeRepo([
    person({ id: "b", name: "Nina", archivedAt: new Date() }),
  ]);
  const out2 = await createPeopleService(repo2).create(CALLER.orgId, CALLER.managerId, { name: "nina" });
  assert.notEqual(out2.person.id, "b");
  assert.equal(rows2.length, 2);
});

test("create rejects a blank name and caps fields", async () => {
  const { repo, rows } = fakeRepo();
  const service = createPeopleService(repo);
  await assert.rejects(() => service.create(CALLER.orgId, CALLER.managerId, { name: "   " }), /name/i);
  await assert.rejects(() => service.create(CALLER.orgId, CALLER.managerId, { name: 42 as unknown as string }), /name/i);
  assert.equal(rows.length, 0);
  const long = await service.create(CALLER.orgId, CALLER.managerId, { name: "x".repeat(500) });
  assert.equal(long.person.name.length, 80); // NAME_CAP
});

test("update edits name/role/seniority on the caller's own person; misses 404", async () => {
  const { repo, rows } = fakeRepo([person({ id: "a" })]);
  const service = createPeopleService(repo);
  const out = await service.update("a", CALLER.orgId, CALLER.managerId, { name: " Priya S. " });
  assert.equal(out.person.name, "Priya S.");
  assert.equal(rows[0]?.name, "Priya S.");
  // fencing: another manager / another org / unknown id → not found, not forbidden
  await assert.rejects(() => service.update("a", "o1", "OTHER", { name: "X" }), /not found/i);
  await assert.rejects(() => service.update("a", "OTHER", "m1", { name: "X" }), /not found/i);
  await assert.rejects(() => service.update("nope", CALLER.orgId, CALLER.managerId, { name: "X" }), /not found/i);
});

test("update with a blank name rejects; role/seniority may be cleared to null", async () => {
  const { repo } = fakeRepo([person({ id: "a" })]);
  const service = createPeopleService(repo);
  await assert.rejects(() => service.update("a", CALLER.orgId, CALLER.managerId, { name: "  " }), /name/i);
  const out = await service.update("a", CALLER.orgId, CALLER.managerId, { role: "", seniority: "" });
  assert.equal(out.person.role, null);
  assert.equal(out.person.seniority, null);
});

test("merge folds one person into another and collapses chains", async () => {
  const { repo, rows } = fakeRepo([
    person({ id: "a", name: "Priya" }),
    person({ id: "b", name: "Priya Shah" }),
    person({ id: "c", name: "P. Shah", mergedIntoId: "a" }), // already folded into a
  ]);
  const service = createPeopleService(repo);
  await service.merge("a", CALLER.orgId, CALLER.managerId, "b");
  assert.equal(rows.find((r) => r.id === "a")?.mergedIntoId, "b");
  // the chain c→a collapses to the canonical target
  assert.equal(rows.find((r) => r.id === "c")?.mergedIntoId, "b");
});

test("merge follows the target's chain to its canonical head", async () => {
  const { repo, rows } = fakeRepo([
    person({ id: "a", name: "A" }),
    person({ id: "b", name: "B", mergedIntoId: "c" }),
    person({ id: "c", name: "C" }),
  ]);
  await createPeopleService(repo).merge("a", CALLER.orgId, CALLER.managerId, "b");
  assert.equal(rows.find((r) => r.id === "a")?.mergedIntoId, "c"); // resolved through b
});

test("merge rejects self, cycles, and unknown/foreign rows", async () => {
  const { repo } = fakeRepo([
    person({ id: "a", name: "A" }),
    person({ id: "b", name: "B", mergedIntoId: "a" }),
    person({ id: "x", name: "X", managerId: "OTHER" }),
  ]);
  const service = createPeopleService(repo);
  await assert.rejects(() => service.merge("a", CALLER.orgId, CALLER.managerId, "a"), /themselves/i);
  // b already points at a — merging a into b would loop
  await assert.rejects(() => service.merge("a", CALLER.orgId, CALLER.managerId, "b"), /loop/i);
  await assert.rejects(() => service.merge("a", CALLER.orgId, CALLER.managerId, "x"), /not found/i);
  await assert.rejects(() => service.merge("x", CALLER.orgId, CALLER.managerId, "a"), /not found/i);
});

test("resolveForRun: explicit personId must be the caller's own — returns its canonical id, 400 otherwise", async () => {
  const { repo } = fakeRepo([
    person({ id: "a", name: "Priya", mergedIntoId: "b" }), // stale picker id, merged away
    person({ id: "b", name: "Priya Shah" }),
    person({ id: "x", name: "Foreign", managerId: "OTHER" }),
  ]);
  const service = createPeopleService(repo);
  // a merged row resolves to its canonical head
  assert.equal(await service.resolveForRun("o1", "m1", { personId: "a", name: "Priya" }), "b");
  // someone else's row → 400 (tampered/stale client), never a silent cross-link
  await assert.rejects(() => service.resolveForRun("o1", "m1", { personId: "x", name: "F" }), /personId/i);
});

test("resolveForRun: no personId → auto-match-or-create from the name (dedupes like create)", async () => {
  const { repo, rows } = fakeRepo([person({ id: "a", name: "Priya Shah" })]);
  const service = createPeopleService(repo);
  assert.equal(await service.resolveForRun("o1", "m1", { name: " priya shah " }), "a"); // match, no new row
  const fresh = await service.resolveForRun("o1", "m1", { name: "Marco Diaz", role: "PM", seniority: "Mid" });
  assert.ok(fresh);
  assert.equal(rows.length, 2);
  assert.equal(rows[1]?.role, "PM");
});

test("resolveForRun: best-effort — anonymous caller or blank/invalid name returns null, never throws", async () => {
  const { repo, rows } = fakeRepo();
  const service = createPeopleService(repo);
  assert.equal(await service.resolveForRun(null, "m1", { name: "Priya" }), null); // guest: no org
  assert.equal(await service.resolveForRun("o1", null, { name: "Priya" }), null); // no user
  assert.equal(await service.resolveForRun("o1", "m1", { name: "   " }), null); // nothing to match on
  assert.equal(await service.resolveForRun("o1", "m1", { name: 42 }), null);
  assert.equal(rows.length, 0);
});

test("resolveForRun: a repo failure on the auto path is swallowed (a run start must not die on the roster)", async () => {
  const broken: PeopleRepo = {
    listForManager: async () => { throw new Error("db down"); },
    findForManager: async () => { throw new Error("db down"); },
    insert: async () => { throw new Error("db down"); },
    update: async () => { throw new Error("db down"); },
  };
  const service = createPeopleService(broken);
  assert.equal(await service.resolveForRun("o1", "m1", { name: "Priya" }), null);
});

test("archive stamps archivedAt on the caller's own person; misses 404", async () => {
  const { repo, rows } = fakeRepo([person({ id: "a" })]);
  const service = createPeopleService(repo);
  const out = await service.archive("a", CALLER.orgId, CALLER.managerId);
  assert.equal(out.ok, true);
  assert.ok(rows[0]?.archivedAt instanceof Date);
  await assert.rejects(() => service.archive("a", "o1", "OTHER"), /not found/i);
});
