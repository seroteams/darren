#!/usr/bin/env node
// Phase 1 of arc-editor: the overlay data layer + registry merge.
// All offline — no API, no model calls.

const assert = require("node:assert");
const {
  validateArc,
  writeOverlay,
  loadOverlay,
  removeOverlay,
  diffStageIds,
  validKey,
} = require("../backend/engine/arc-overlay.ts");
const { getArc, listStageIds } = require("../backend/engine/one-on-one-types/index.ts");

const SLUG = "bi_weekly_check_in";
const LABEL = "Bi-weekly check-in";

function idsOf(arc) {
  return arc.arc.map((s) => s.id);
}

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL ${name}: ${e.message}`);
  }
}

// Make sure no stray overlay from a previous run pollutes the assertions.
removeOverlay(SLUG);

// --- validateArc ----------------------------------------------------------
const goodArc = [
  { id: "pulse", label: "Pulse", intent: "x", target_questions: 1 },
  { id: "friction", label: "Friction", intent: "y", target_questions: 2 },
];

check("validateArc accepts a well-formed arc", () => {
  assert.deepStrictEqual(validateArc(goodArc), { ok: true, errors: [] });
});

check("validateArc rejects duplicate ids", () => {
  const r = validateArc([
    { id: "pulse", label: "A", target_questions: 1 },
    { id: "pulse", label: "B", target_questions: 1 },
  ]);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => /duplicate/i.test(e)), "expected a duplicate-id error");
});

check("validateArc rejects an empty id", () => {
  const r = validateArc([{ id: "  ", label: "A", target_questions: 1 }]);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.some((e) => /empty id/i.test(e)));
});

check("validateArc rejects a bad target_questions", () => {
  const r = validateArc([{ id: "pulse", label: "A", target_questions: -1 }]);
  assert.strictEqual(r.ok, false);
  const r2 = validateArc([{ id: "pulse", label: "A", target_questions: 1.5 }]);
  assert.strictEqual(r2.ok, false);
});

check("validateArc rejects an empty arc", () => {
  assert.strictEqual(validateArc([]).ok, false);
});

check("validKey guards against path traversal", () => {
  assert.strictEqual(validKey(SLUG), true);
  assert.strictEqual(validKey("../secret"), false);
  assert.strictEqual(validKey("Bad Slug"), false);
});

// --- default read (no overlay) -------------------------------------------
check("getArc returns the code default when no overlay exists", () => {
  assert.deepStrictEqual(idsOf(getArc(LABEL)), ["pulse", "friction", "momentum", "lift"]);
});

// --- overlay roundtrip + merge precedence --------------------------------
check("an overlay merges over the default and resets cleanly", () => {
  try {
    writeOverlay(SLUG, {
      tone_register: "OVERLAID TONE",
      arc: [
        { id: "pulse", label: "Pulse", intent: "edited intent", target_questions: 3 },
        { id: "lift", label: "Lift", intent: "z", target_questions: 1 },
      ],
    });

    assert.ok(loadOverlay(SLUG), "overlay should load back");

    const arc = getArc(LABEL);
    assert.strictEqual(arc.tone_register, "OVERLAID TONE", "tone should be overlaid");
    assert.deepStrictEqual(idsOf(arc), ["pulse", "lift"], "arc should be overlaid");
    assert.strictEqual(arc.arc[0].target_questions, 3);

    // Other types are untouched.
    assert.deepStrictEqual(
      idsOf(getArc("Growth & career plan")),
      ["anchor", "aspiration", "gap", "investment", "commitment"]
    );
  } finally {
    removeOverlay(SLUG);
  }
  // After reset, back to the code default.
  assert.deepStrictEqual(idsOf(getArc(LABEL)), ["pulse", "friction", "momentum", "lift"]);
  assert.strictEqual(loadOverlay(SLUG), null);
});

// --- orphan count --------------------------------------------------------
const currentIds = listStageIds(LABEL);

check("diffStageIds reports zero orphans when all ids are kept", () => {
  const sameArc = currentIds.map((id) => ({ id, label: id, target_questions: 1 }));
  const d = diffStageIds(SLUG, sameArc, { currentStageIds: currentIds });
  assert.strictEqual(d.total, 0, `expected 0 orphans, got ${JSON.stringify(d)}`);
});

check("diffStageIds counts intro questions orphaned by dropping a phase", () => {
  // Drop "pulse" — at least the seeded q_intro_biweekly_pace is tagged to it.
  const withoutPulse = currentIds
    .filter((id) => id !== "pulse")
    .map((id) => ({ id, label: id, target_questions: 1 }));
  const d = diffStageIds(SLUG, withoutPulse, { currentStageIds: currentIds });
  assert.ok(d.intro >= 1, `expected >=1 orphaned intro question, got ${d.intro}`);
  assert.ok(d.removed_ids.includes("pulse"), "removed_ids should include pulse");
  assert.strictEqual(d.total, d.intro + d.openers);
});

if (failed) {
  console.error(`\ntest-arc-overlay: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("PASS test-arc-overlay");
