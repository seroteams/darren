// Concurrency cap + circuit breaker for live AI calls (engine-hardening Phase 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSemaphore, createBreaker, createAiGuard, CircuitOpenError } from "./ai-guard.ts";

test("semaphore never exceeds the concurrency cap", async () => {
  const sem = createSemaphore(4);
  let concurrent = 0;
  let peak = 0;
  const task = (): Promise<void> =>
    sem.run(async () => {
      concurrent++;
      peak = Math.max(peak, concurrent);
      await new Promise((r) => setTimeout(r, 5));
      concurrent--;
    });
  await Promise.all(Array.from({ length: 10 }, task));
  assert.ok(peak <= 4, `peak ${peak} exceeded cap 4`);
  assert.equal(sem.active(), 0);
});

test("breaker opens after N consecutive failures and then fast-fails", async () => {
  const breaker = createBreaker({ threshold: 3, cooldownMs: 1000, now: () => 0 });
  const boom = (): Promise<unknown> =>
    breaker.run(async () => {
      throw new Error("provider down");
    });
  for (let i = 0; i < 3; i++) await assert.rejects(boom, /provider down/);
  assert.equal(breaker.state(), "open");
  // Once open, the next call fast-fails without invoking fn.
  let called = false;
  await assert.rejects(
    () =>
      breaker.run(async () => {
        called = true;
        return "ok";
      }),
    CircuitOpenError,
  );
  assert.equal(called, false);
});

test("breaker half-opens after cooldown and closes on a probe success", async () => {
  let clock = 0;
  const breaker = createBreaker({ threshold: 2, cooldownMs: 100, now: () => clock });
  const boom = (): Promise<unknown> =>
    breaker.run(async () => {
      throw new Error("down");
    });
  await assert.rejects(boom);
  await assert.rejects(boom);
  assert.equal(breaker.state(), "open");
  clock = 100; // cooldown elapsed → next call is a half-open probe
  const r = await breaker.run(async () => "recovered");
  assert.equal(r, "recovered");
  assert.equal(breaker.state(), "closed");
});

test("aiGuard combines cap + breaker and leaves successful calls untouched", async () => {
  const guard = createAiGuard({ concurrency: 2, threshold: 3, now: () => 0 });
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) => guard.run(async () => i)),
  );
  assert.deepEqual(results, [0, 1, 2, 3, 4]);
});
