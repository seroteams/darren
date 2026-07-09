// The boot-hydrated question cache (postgres-runtime-data Phase 4) — DB-less
// tests via the injectable row loader. The contract under test:
//   1. dedup semantics identical to file mode (same alias in → one kept),
//   2. _runtime rows never enter the selection pool (but DO hold their alias),
//   3. hydration merges the static file aliases (seed/intro/openers),
//   4. reading before hydration in DB mode fails LOUDLY — no silent empty pool.

import test from "node:test";
import assert from "node:assert/strict";
import {
  hydrateQuestionCache,
  resetQuestionCache,
  isQuestionCacheHydrated,
  cachePoolDocs,
  cacheAliases,
  cacheSaveQuestion,
  cacheGetQuestion,
  requireHydrated,
} from "./questions-store.ts";

function row(alias: string, subdir = "", doc: Record<string, unknown> = {}) {
  return { alias, subdir, doc: { alias, name: `${alias}?`, ...doc } };
}

test("hydration fills the pool from subdir '' rows only; _runtime rows contribute aliases, not pool docs", async () => {
  resetQuestionCache();
  await hydrateQuestionCache({
    loadRows: async () => [row("q_pool_one"), row("q_pool_two"), row("q_run_rec", "_runtime")],
    staticAliases: () => new Set(["q_seed_static"]),
  });
  assert.equal(isQuestionCacheHydrated(), true);
  assert.deepEqual(cachePoolDocs().map((d) => d.alias), ["q_pool_one", "q_pool_two"]);
  const aliases = cacheAliases();
  assert.ok(aliases.has("q_run_rec"), "_runtime alias counts for dedup");
  assert.ok(aliases.has("q_seed_static"), "static file aliases merge in");
  assert.ok(!cachePoolDocs().some((d) => d.alias === "q_run_rec"), "_runtime never enters the pool");
});

test("save dedup: the same alias saved twice keeps one pool entry (first wins, like UNIQUE + do-nothing)", async () => {
  resetQuestionCache();
  await hydrateQuestionCache({ loadRows: async () => [], staticAliases: () => new Set() });
  cacheSaveQuestion({ alias: "q_new", name: "First?" });
  cacheSaveQuestion({ alias: "q_new", name: "Second copy?" });
  assert.equal(cachePoolDocs().length, 1);
  assert.equal(cacheGetQuestion("q_new")?.name, "First?");
  assert.ok(cacheAliases().has("q_new"));
});

test("_runtime saves register the alias without touching the pool", async () => {
  resetQuestionCache();
  await hydrateQuestionCache({ loadRows: async () => [], staticAliases: () => new Set() });
  cacheSaveQuestion({ alias: "q_thread_follow_9", name: "Follow up?" }, "_runtime");
  assert.equal(cachePoolDocs().length, 0);
  assert.ok(cacheAliases().has("q_thread_follow_9"));
});

test("reads before hydration fail loudly — no silent empty pool", () => {
  resetQuestionCache();
  assert.equal(isQuestionCacheHydrated(), false);
  assert.throws(() => requireHydrated(), /hydrateQuestionCache/);
});

test("hydration is idempotent and re-runnable (boot + tests)", async () => {
  resetQuestionCache();
  await hydrateQuestionCache({ loadRows: async () => [row("q_a")], staticAliases: () => new Set() });
  await hydrateQuestionCache({ loadRows: async () => [row("q_a"), row("q_b")], staticAliases: () => new Set() });
  assert.deepEqual(cachePoolDocs().map((d) => d.alias), ["q_a", "q_b"]);
});
