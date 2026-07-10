// Cost tracker — per-call latency capture (engine-hardening Phase 1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTracker } from "./cost.ts";

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
