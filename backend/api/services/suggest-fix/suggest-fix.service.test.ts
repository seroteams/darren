import { test } from "node:test";
import assert from "node:assert/strict";
import { createSuggestFixService } from "./suggest-fix.service.ts";
import type { RunFix } from "./suggest-fix.service.ts";
import type { SuggestFixRepo } from "./suggest-fix.repo.ts";
import { isObjectRecord } from "../../../shared/guards.ts";

// A fake repo returns canned state + prompt/response reads, and a fake RunFix
// stands in for the AI call — so the gate/assembly logic is exercised with zero
// storage and zero model calls.
function fakeRepo(over: Partial<SuggestFixRepo> = {}): SuggestFixRepo {
  return {
    readState: async () => ({ verdict: { verdict: "fix" }, ctx: { role: "PM" } }),
    readPrompt: async () => "PROMPT",
    readResponse: async () => "RESPONSE",
    ...over,
  };
}

function hasStatus(n: number): (e: unknown) => boolean {
  return (e) => isObjectRecord(e) && e.status === n;
}

const okFix: RunFix = async () => ({ fix: 1 });

test("missing runId rejects with 400", async () => {
  const svc = createSuggestFixService(fakeRepo(), okFix);
  await assert.rejects(() => svc.suggest(undefined, undefined), hasStatus(400));
});

test("unknown run rejects with 404", async () => {
  const svc = createSuggestFixService(fakeRepo({ readState: async () => null }), okFix);
  await assert.rejects(() => svc.suggest("r1", undefined), hasStatus(404));
});

test("a run with no verdict rejects with 409", async () => {
  const svc = createSuggestFixService(fakeRepo({ readState: async () => ({}) }), okFix);
  await assert.rejects(() => svc.suggest("r1", undefined), hasStatus(409));
});

test("happy path assembles the inputs, calls the fixer, returns { fix }", async () => {
  const seen: unknown[] = [];
  const runFix: RunFix = async (input) => {
    seen.push(input);
    return { patch: "do X" };
  };
  const svc = createSuggestFixService(fakeRepo(), runFix);
  const out = await svc.suggest("r1", undefined);
  assert.deepEqual(out, { fix: { patch: "do X" } });
  assert.deepEqual(seen, [
    {
      stage: "evaluation",
      promptText: "PROMPT",
      responseText: "RESPONSE",
      verdict: { verdict: "fix" },
      ctx: { role: "PM" },
    },
  ]);
});

test("stage defaults to evaluation but honours a provided stage", async () => {
  const stages: string[] = [];
  const repo = fakeRepo({
    readPrompt: async (_id, stage) => {
      stages.push(stage);
      return "P";
    },
    readResponse: async (_id, stage) => {
      stages.push(stage);
      return "R";
    },
  });
  const svc = createSuggestFixService(repo, okFix);
  await svc.suggest("r1", "questioning");
  assert.deepEqual(stages, ["questioning", "questioning"]);
});

test("a fixer failure rejects with 502 and a clear message", async () => {
  const runFix: RunFix = async () => {
    throw new Error("model boom");
  };
  const svc = createSuggestFixService(fakeRepo(), runFix);
  await assert.rejects(
    () => svc.suggest("r1", undefined),
    (e) => hasStatus(502)(e) && isObjectRecord(e) && typeof e.message === "string" && /fix suggestion failed/.test(e.message)
  );
});
