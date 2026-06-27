import { test } from "node:test";
import assert from "node:assert/strict";
import { createLexiconService } from "./lexicon.service.ts";
import type { LexiconRepo, PromotionApplyResult } from "./lexicon.repo.ts";

// A fake repo returns canned pending items / apply result and records the
// decisions it was handed — proving the service's forward/count/coerce/wrap
// logic is independent of the promotion storage.
function fakeRepo(opts: { items?: unknown[]; result?: PromotionApplyResult } = {}): {
  repo: LexiconRepo;
  applied: unknown[];
} {
  const applied: unknown[] = [];
  const result: PromotionApplyResult = opts.result ?? { promoted: 0, dropped: 0, skipped: 0, remaining: 0 };
  const repo: LexiconRepo = {
    listPending: () => opts.items ?? [],
    applyDecisions: (decisions) => {
      applied.push(decisions);
      return result;
    },
  };
  return { repo, applied };
}

test("pending forwards the repo's items and counts them", () => {
  const { repo } = fakeRepo({ items: [{ id: "a" }, { id: "b" }] });
  assert.deepEqual(createLexiconService(repo).pending(), {
    items: [{ id: "a" }, { id: "b" }],
    count: 2,
  });
});

test("apply forwards a decisions array and wraps the result with ok", () => {
  const { repo, applied } = fakeRepo({ result: { promoted: 2, dropped: 1, skipped: 0, remaining: 3 } });
  const out = createLexiconService(repo).apply([{ id: "x", keep: true }]);
  assert.deepEqual(out, { ok: true, promoted: 2, dropped: 1, skipped: 0, remaining: 3 });
  assert.deepEqual(applied, [[{ id: "x", keep: true }]]);
});

test("apply coerces a missing/non-array decisions to an empty list", () => {
  const { repo, applied } = fakeRepo();
  const out = createLexiconService(repo).apply(undefined);
  assert.deepEqual(out, { ok: true, promoted: 0, dropped: 0, skipped: 0, remaining: 0 });
  assert.deepEqual(applied, [[]]);
});
