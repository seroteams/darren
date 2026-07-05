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
    hideTerm: (key, term) => {
      calls.push(`hide:${key}:${String(term)}`);
      return ["hidden-word"];
    },
    unhideTerm: (key, term) => {
      calls.push(`unhide:${key}:${String(term)}`);
      return [];
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

test("hideTerm passes key + term to the repo and wraps the hidden list", () => {
  const { repo, calls } = fakeRepo();
  const out = createRoleLexiconsService(repo).hideTerm("eng", "quota");
  assert.deepEqual(out, { ok: true, hidden: ["hidden-word"] });
  assert.deepEqual(calls, ["hide:eng:quota"]);
});

test("unhideTerm passes key + term to the repo and wraps the hidden list", () => {
  const { repo, calls } = fakeRepo();
  const out = createRoleLexiconsService(repo).unhideTerm("eng", "quota");
  assert.deepEqual(out, { ok: true, hidden: [] });
  assert.deepEqual(calls, ["unhide:eng:quota"]);
});
