import { test } from "node:test";
import assert from "node:assert/strict";
import { createTeamService } from "./team.service.ts";
import type { TeamRepo, PeopleAliases } from "./team.repo.ts";

// In-memory fake — the merge/rename/resolve logic is proven without touching disk.
function fakeRepo(seed: PeopleAliases = { merges: {}, names: {} }): TeamRepo & { store: PeopleAliases } {
  const store: PeopleAliases = { merges: { ...seed.merges }, names: { ...seed.names } };
  return {
    store,
    read: async () => ({ merges: { ...store.merges }, names: { ...store.names } }),
    write: async (_u, data) => {
      store.merges = { ...data.merges };
      store.names = { ...data.names };
    },
  };
}

async function thrown(fn: () => Promise<unknown>): Promise<{ status?: number }> {
  try {
    await fn();
    return {};
  } catch (e) {
    return e as { status?: number };
  }
}

test("merge folds one key into another", async () => {
  const repo = fakeRepo();
  const svc = createTeamService(repo);
  const out = await svc.merge("u1", "priya s", "priya");
  assert.equal(out.merges["priya s"], "priya");
});

test("merge collapses a chain to one canonical key", async () => {
  // priya s → priya already; merging priya → p means priya s should re-point to p too.
  const repo = fakeRepo({ merges: { "priya s": "priya" }, names: {} });
  const svc = createTeamService(repo);
  const out = await svc.merge("u1", "priya", "p");
  assert.equal(out.merges["priya"], "p");
  assert.equal(out.merges["priya s"], "p"); // collapsed, not left pointing at the old key
});

test("merge rejects a self-merge and a cycle", async () => {
  assert.equal((await thrown(() => createTeamService(fakeRepo()).merge("u1", "priya", "priya"))).status, 400);
  const repo = fakeRepo({ merges: { a: "b" }, names: {} });
  assert.equal((await thrown(() => createTeamService(repo).merge("u1", "b", "a"))).status, 400); // b→a with a→b = loop
});

test("merge requires both keys", async () => {
  assert.equal((await thrown(() => createTeamService(fakeRepo()).merge("u1", "", "priya"))).status, 400);
});

test("rename sets a display name on the canonical key", async () => {
  const repo = fakeRepo({ merges: { "priya s": "priya" }, names: {} });
  const svc = createTeamService(repo);
  const out = await svc.rename("u1", "priya s", "Priya Sharma"); // renames via the merged key
  assert.equal(out.names["priya"], "Priya Sharma"); // stored on canonical, not the alias
});

test("rename with a blank name clears the override", async () => {
  const repo = fakeRepo({ merges: {}, names: { priya: "Priya S." } });
  const svc = createTeamService(repo);
  const out = await svc.rename("u1", "priya", "  ");
  assert.equal(out.names["priya"], undefined);
});

test("getAliases returns the stored map", async () => {
  const repo = fakeRepo({ merges: { a: "b" }, names: { b: "Bee" } });
  assert.deepEqual(await createTeamService(repo).getAliases("u1"), { merges: { a: "b" }, names: { b: "Bee" } });
});
