// Cost tracker — per-call latency capture (engine-hardening Phase 1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTracker, setActive, getActive, runWithTracker, record, CostCeilingError } from "./cost.ts";

// H2 — spend cap. The module-level record() enforces a per-run USD ceiling
// (SERO_RUN_USD_CAP) against the active tracker so a runaway session aborts
// honestly instead of billing without bound.
test("module record() throws CostCeilingError when the per-run USD cap is exceeded", () => {
  const prev = getActive();
  const prevCap = process.env.SERO_RUN_USD_CAP;
  try {
    process.env.SERO_RUN_USD_CAP = "0.0000001"; // any real cost trips it
    setActive(createTracker());
    assert.throws(
      () => record("05-evaluation", "gpt-4o-mini", { prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 }),
      (err) => err instanceof CostCeilingError,
    );
  } finally {
    if (prevCap === undefined) delete process.env.SERO_RUN_USD_CAP;
    else process.env.SERO_RUN_USD_CAP = prevCap;
    setActive(prev);
  }
});

test("module record() stays silent under the cap", () => {
  const prev = getActive();
  const prevCap = process.env.SERO_RUN_USD_CAP;
  try {
    process.env.SERO_RUN_USD_CAP = "100";
    setActive(createTracker());
    assert.doesNotThrow(() =>
      record("05-evaluation", "gpt-4o-mini", { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }),
    );
  } finally {
    if (prevCap === undefined) delete process.env.SERO_RUN_USD_CAP;
    else process.env.SERO_RUN_USD_CAP = prevCap;
    setActive(prev);
  }
});

test("module record() with cap disabled (<=0) never throws", () => {
  const prev = getActive();
  const prevCap = process.env.SERO_RUN_USD_CAP;
  try {
    process.env.SERO_RUN_USD_CAP = "0";
    setActive(createTracker());
    assert.doesNotThrow(() =>
      record("05-evaluation", "gpt-4o-mini", { prompt_tokens: 100000, completion_tokens: 100000, total_tokens: 200000 }),
    );
  } finally {
    if (prevCap === undefined) delete process.env.SERO_RUN_USD_CAP;
    else process.env.SERO_RUN_USD_CAP = prevCap;
    setActive(prev);
  }
});

test("CostCeilingError is non-retryable so withRetry won't re-bill it", () => {
  const e = new CostCeilingError(2, 1);
  assert.equal(e.retryable, false);
  assert.equal(e.name, "CostCeilingError");
});

// F7 — two concurrent runs each keep their OWN tracker. Interleave the records the way
// two managers prepping at once would; before the AsyncLocalStorage fix, a shared global
// meant A's cost could land on B's tracker (or on none). Here each run must see only its own.
test("runWithTracker isolates cost between concurrently interleaved runs", async () => {
  const a = createTracker();
  const b = createTracker();
  const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };
  const step = () => new Promise((r) => setImmediate(r)); // force interleaving

  await Promise.all([
    runWithTracker(a, async () => {
      record("A1", "gpt-4o-mini", usage);
      await step();
      record("A2", "gpt-4o-mini", usage); // still lands on A even after B ran in between
    }),
    runWithTracker(b, async () => {
      await step();
      record("B1", "gpt-4o-mini", usage);
    }),
  ]);

  assert.deepEqual(a.summary().calls.map((c) => c.stage), ["A1", "A2"]);
  assert.deepEqual(b.summary().calls.map((c) => c.stage), ["B1"]);
});

test("records per-call ms and sums total_ms", () => {
  const t = createTracker();
  t.record("focus_points", "gpt-4o-mini", { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }, 120);
  t.record("preparation", "gpt-4o-mini", { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 }, 340);
  const s = t.summary();
  assert.equal(s.calls[0]?.ms, 120);
  assert.equal(s.calls[1]?.ms, 340);
  assert.equal(s.total_ms, 460);
});

test("defaults ms to 0 when the duration is omitted", () => {
  const t = createTracker();
  t.record("bank", "gpt-4o-mini", { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 });
  const s = t.summary();
  assert.equal(s.calls[0]?.ms, 0);
  assert.equal(s.total_ms, 0);
});
