#!/usr/bin/env node
"use strict";

// H5 — pure prose-diff logic (no API). Proves the "did the writing get worse?"
// comparison flags a substantially reworded field and passes an identical one.

const assert = require("node:assert/strict");
const { diffProse, snapshotProse, similarity } = require("./lib/prose-diff");

let passed = 0;
function ok(name, fn) {
  fn();
  console.log(`  PASS  ${name}`);
  passed += 1;
}

const approved = {
  headline: "Strong week on the payments refactor",
  summary_bullets: ["Shipped the refactor", "Unblocked a teammate"],
  understanding_paragraph: "Priya drove the payments refactor and mentored a junior.",
  brutal_truth_employee: "Keep tightening code-review turnaround.",
  brutal_truth_manager: "Ready for a bigger scope soon.",
  next_actions: ["Pair on the next migration"],
  watch_for: ["Review latency creeping up"],
};

ok("identical briefing → no change, overall 1.0", () => {
  const d = diffProse(approved, approved);
  assert.equal(d.changed, false);
  assert.equal(d.overall, 1);
});

ok("a fully reworded field is flagged as changed", () => {
  const worse = { ...approved, headline: "An ok-ish period with some progress noted overall" };
  const d = diffProse(approved, worse);
  assert.equal(d.changed, true);
  const hl = d.fields.find((f) => f.field === "headline");
  assert.ok(hl.changed, "headline should be flagged");
  assert.ok(hl.ratio < 0.8, `headline ratio ${hl.ratio} should be below tolerance`);
});

ok("a minor synonym tweak stays within tolerance", () => {
  const tweak = { ...approved, brutal_truth_employee: "Keep tightening code-review turnaround time." };
  const d = diffProse(approved, tweak);
  const f = d.fields.find((x) => x.field === "brutal_truth_employee");
  assert.equal(f.changed, false, `minor tweak should not trip (ratio ${f.ratio})`);
});

ok("tolerance is configurable", () => {
  const tweak = { ...approved, headline: "Strong week on the payments migration" };
  assert.equal(diffProse(approved, tweak, { tolerance: 0.99 }).changed, true);
  assert.equal(diffProse(approved, tweak, { tolerance: 0.5 }).changed, false);
});

ok("snapshotProse keeps only the tracked prose fields", () => {
  const snap = snapshotProse({ ...approved, axes: [1, 2, 3], internal: "x" });
  assert.equal("axes" in snap, false);
  assert.equal("internal" in snap, false);
  assert.equal(snap.headline, approved.headline);
});

ok("similarity: empty vs empty is 1, empty vs text is 0", () => {
  assert.equal(similarity("", ""), 1);
  assert.equal(similarity("", "some words here"), 0);
});

console.log(`\n  all prose-diff checks passed (${passed})`);
