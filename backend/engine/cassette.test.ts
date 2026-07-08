// Cassette record/replay for callAI — the offline-verification seam (agent-native P1).
// Replay: SERO_CASSETTE_REPLAY=<dir> serves recorded responses per costLabel (FIFO,
// reuse-last when exhausted) with NO network and NO API key. Record:
// SERO_CASSETTE_RECORD=<dir> appends exactly the raw string callAI returns.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { callAI } from "./ai-client.ts";

let dir: string;
const savedEnv: Record<string, string | undefined> = {};
const savedFetch = globalThis.fetch;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cassette-test-"));
  for (const k of ["SERO_CASSETTE_REPLAY", "SERO_CASSETTE_RECORD", "OPENAI_API_KEY"]) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  globalThis.fetch = savedFetch;
  fs.rmSync(dir, { recursive: true, force: true });
});

function writeCassette(entries: Array<{ label: string; response: string }>): void {
  fs.writeFileSync(path.join(dir, "cassette.json"), JSON.stringify({ entries }, null, 2));
}

const baseArgs = {
  system: "You are a test.",
  user: "Say hi.",
  schema: { type: "object" },
  schemaName: "test",
  temperature: 0,
  model: "gpt-4o-mini",
};

test("replay serves the recorded response by costLabel — no API key, no network", async () => {
  writeCassette([{ label: "01-focus-points", response: '{"focus":"recorded"}' }]);
  process.env.SERO_CASSETTE_REPLAY = dir;
  // No OPENAI_API_KEY set and fetch would blow up if touched:
  globalThis.fetch = () => {
    throw new Error("network touched during replay");
  };
  const out = await callAI({ ...baseArgs, costLabel: "01-focus-points" });
  assert.equal(out, '{"focus":"recorded"}');
});

test("replay is FIFO per label and reuses the last entry when exhausted", async () => {
  writeCassette([
    { label: "04-plan-turn", response: "turn-1" },
    { label: "04-plan-turn", response: "turn-2" },
  ]);
  process.env.SERO_CASSETTE_REPLAY = dir;
  assert.equal(await callAI({ ...baseArgs, costLabel: "04-plan-turn" }), "turn-1");
  assert.equal(await callAI({ ...baseArgs, costLabel: "04-plan-turn" }), "turn-2");
  // Exhausted → reuse last (live code may legitimately ask more often than the
  // recorded run did, e.g. a validation retry):
  assert.equal(await callAI({ ...baseArgs, costLabel: "04-plan-turn" }), "turn-2");
});

test("replay throws a clear error for a label the cassette never recorded", async () => {
  writeCassette([{ label: "01-focus-points", response: "x" }]);
  process.env.SERO_CASSETTE_REPLAY = dir;
  await assert.rejects(
    () => callAI({ ...baseArgs, costLabel: "05-evaluation" }),
    /cassette.*05-evaluation/i,
  );
});

test("replay still rejects unresolved {{PLACEHOLDER}} prompts — replay must not hide prompt-fill bugs", async () => {
  writeCassette([{ label: "01-focus-points", response: "x" }]);
  process.env.SERO_CASSETTE_REPLAY = dir;
  await assert.rejects(
    () => callAI({ ...baseArgs, user: "Hello {{EMPLOYEE_NAME}}", costLabel: "01-focus-points" }),
    /Unresolved prompt placeholders/,
  );
});

test("record appends exactly the raw string callAI returns", async () => {
  process.env.SERO_CASSETTE_RECORD = dir;
  process.env.OPENAI_API_KEY = "test-key";
  const rawContent = '{"focus":"live-answer"}';
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        choices: [{ message: { content: rawContent } }],
      }),
      { status: 200 },
    )) as typeof fetch;

  const out = await callAI({ ...baseArgs, costLabel: "01-focus-points" });
  assert.equal(out, rawContent);

  const cassette = JSON.parse(fs.readFileSync(path.join(dir, "cassette.json"), "utf8"));
  assert.equal(cassette.entries.length, 1);
  assert.equal(cassette.entries[0].label, "01-focus-points");
  assert.equal(cassette.entries[0].model, "gpt-4o-mini");
  assert.equal(cassette.entries[0].response, rawContent);
});

test("record appends across calls in order", async () => {
  process.env.SERO_CASSETTE_RECORD = dir;
  process.env.OPENAI_API_KEY = "test-key";
  let n = 0;
  globalThis.fetch = (async () => {
    n += 1;
    return new Response(
      JSON.stringify({
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        choices: [{ message: { content: `reply-${n}` } }],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  await callAI({ ...baseArgs, costLabel: "04-plan-turn" });
  await callAI({ ...baseArgs, costLabel: "04-plan-turn" });
  const cassette = JSON.parse(fs.readFileSync(path.join(dir, "cassette.json"), "utf8"));
  assert.deepEqual(
    cassette.entries.map((e: { response: string }) => e.response),
    ["reply-1", "reply-2"],
  );
});
