import { test } from "node:test";
import assert from "node:assert/strict";
import { createRoleLexiconsService } from "./role-lexicons.service.ts";
import type { RoleLexiconsRepo } from "./role-lexicons.repo.ts";

// A fake repo records its calls and returns canned values — proving the service
// logic (input pass-through + ok-wrapping) is independent of where the words live.
function fakeRepo(): { repo: RoleLexiconsRepo; calls: string[] } {
  const calls: string[] = [];
  const repo: RoleLexiconsRepo = {
    list: () => {
      calls.push("list");
      return [{ key: "eng", words: [] }];
    },
    addTerm: (key, value) => {
      calls.push(`add:${key}:${JSON.stringify(value)}`);
      return { stored: value };
    },
    removeTerm: (key, term) => {
      calls.push(`remove:${key}:${String(term)}`);
      return ["kept"];
    },
  };
  return { repo, calls };
}

test("list forwards the repo's roles unchanged", () => {
  const { repo } = fakeRepo();
  assert.deepEqual(createRoleLexiconsService(repo).list(), [{ key: "eng", words: [] }]);
});

test("addTerm passes { term, meaning } to the repo and wraps the result", () => {
  const { repo, calls } = fakeRepo();
  const out = createRoleLexiconsService(repo).addTerm("eng", "ship", "release");
  assert.deepEqual(out, { ok: true, term: { stored: { term: "ship", meaning: "release" } } });
  assert.deepEqual(calls, ['add:eng:{"term":"ship","meaning":"release"}']);
});

test("removeTerm passes key + term to the repo and wraps the remaining list", () => {
  const { repo, calls } = fakeRepo();
  const out = createRoleLexiconsService(repo).removeTerm("eng", "ship");
  assert.deepEqual(out, { ok: true, remaining: ["kept"] });
  assert.deepEqual(calls, ["remove:eng:ship"]);
});
