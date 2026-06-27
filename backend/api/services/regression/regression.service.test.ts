import { test } from "node:test";
import assert from "node:assert/strict";
import { createRegressionService } from "./regression.service.ts";
import type { SuiteRunner } from "./regression.service.ts";

// A fake suite runner stands in for the real offline replay — the service maps
// its output to the API case shape without running anything.
test("run maps suite results to the API case shape, defaulting empties", () => {
  const fake: SuiteRunner = () => ({
    verdict: "pass",
    summary: { total: 1 },
    results: [
      { id: "c1", name: "Case 1", meetingType: "weekly", kind: "trust", status: "ok", verdict: "pass", expectedVerdict: "pass" },
    ],
  });
  const out = createRegressionService(fake).run();
  assert.equal(out.verdict, "pass");
  assert.deepEqual(out.summary, { total: 1 });
  assert.deepEqual(out.cases, [
    { id: "c1", name: "Case 1", meetingType: "weekly", issue: null, kind: "trust", status: "ok", verdict: "pass", expectedVerdict: "pass", hardFails: [], reasons: [], error: null },
  ]);
});

test("run passes issue / hardFails / reasons / error through when present", () => {
  const fake: SuiteRunner = () => ({
    verdict: "fail",
    summary: {},
    results: [
      { id: "c2", name: "Case 2", meetingType: "feels-off", issue: "drift", kind: "trust", status: "x", verdict: "fail", expectedVerdict: "pass", hardFails: ["H1"], reasons: ["r1"], error: "boom" },
    ],
  });
  const [c] = createRegressionService(fake).run().cases;
  assert.deepEqual(c, {
    id: "c2", name: "Case 2", meetingType: "feels-off", issue: "drift", kind: "trust",
    status: "x", verdict: "fail", expectedVerdict: "pass", hardFails: ["H1"], reasons: ["r1"], error: "boom",
  });
});
