import test from "node:test";
import assert from "node:assert/strict";
import { bootRetry } from "./boot-retry.ts";

// Regression: 2026-07-21 — five live crashes in one week ("Exited with status 1"
// alerts), all the same signature: Render cold-boots after idle, the boot-time
// migration is the FIRST query against a cold Neon compute in another region, the
// 10s connect timeout fires, main() exits 1. One retry later the DB is awake and
// everything works — so boot must ride out a cold database instead of dying on
// the first miss.

const noLog = (): void => {};
const noSleep = async (): Promise<void> => {};

test("bootRetry: first-try success calls fn once and never sleeps", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const out = await bootRetry(async () => { calls += 1; return "ok"; }, {
    log: noLog,
    sleep: async (ms) => { sleeps.push(ms); },
  });
  assert.equal(out, "ok");
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
});

test("bootRetry: transient failures retry until success, sleeping between tries", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const out = await bootRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error("connect ETIMEDOUT (cold database)");
      return calls;
    },
    { attempts: 6, delayMs: 12_000, log: noLog, sleep: async (ms) => { sleeps.push(ms); } },
  );
  assert.equal(out, 3);
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [12_000, 12_000], "one sleep per failed attempt, none after success");
});

test("bootRetry: exhausted attempts rethrow the LAST error so boot dies loud", async () => {
  let calls = 0;
  await assert.rejects(
    bootRetry(
      async () => { calls += 1; throw new Error(`attempt ${calls} failed`); },
      { attempts: 4, log: noLog, sleep: noSleep },
    ),
    /attempt 4 failed/,
  );
  assert.equal(calls, 4);
});

test("bootRetry: defaults give a cold Neon compute ~60s of waiting to wake", async () => {
  // 6 attempts with 12s gaps = 5 sleeps x 12s = 60s of waiting between tries.
  const sleeps: number[] = [];
  await assert.rejects(
    bootRetry(async () => { throw new Error("still cold"); }, {
      log: noLog,
      sleep: async (ms) => { sleeps.push(ms); },
    }),
  );
  const totalWait = sleeps.reduce((a, b) => a + b, 0);
  assert.ok(totalWait >= 60_000, `total between-try wait must be >= 60s, got ${totalWait}ms`);
});

test("bootRetry: each retry is announced so Render logs show WHY boot is waiting", async () => {
  const lines: string[] = [];
  let calls = 0;
  await bootRetry(
    async () => { calls += 1; if (calls === 1) throw new Error("cold database"); },
    { log: (m) => lines.push(m), sleep: noSleep },
  );
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? "", /cold database/);
  assert.match(lines[0] ?? "", /retry/i);
});
