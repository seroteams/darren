// Continuity Phase 1: buildCarryForward turns a prior briefing's agreed actions +
// watch-fors into a plain, editable notes block for the next 1:1. Nothing to carry
// must produce "" (no scaffolding on a blank slate).
import test from "node:test";
import assert from "node:assert/strict";
import { buildCarryForward } from "./carry-forward.ts";

test("no briefing → empty (null / undefined)", () => {
  assert.equal(buildCarryForward(null), "");
  assert.equal(buildCarryForward(undefined), "");
});

test("briefing with no actions and no watch-fors → empty (no scaffolding)", () => {
  assert.equal(buildCarryForward({ next_actions: [], watch_for: [] }), "");
  assert.equal(buildCarryForward({}), "");
});

test("blank/whitespace-only entries are dropped, not carried", () => {
  assert.equal(
    buildCarryForward({ next_actions: [{ when: "", action: "" }], watch_for: ["", "   "] }),
    "",
  );
});

test("agreed actions only → labelled 'What you agreed' block with the header", () => {
  const out = buildCarryForward({
    next_actions: [
      { when: "this week", action: "Ship the API doc" },
      { action: "Check in on workload" },
    ],
  });
  assert.equal(
    out,
    [
      "Since last time (edit or clear this before you run):",
      "What you agreed:",
      "- this week: Ship the API doc",
      "- Check in on workload",
    ].join("\n"),
  );
});

test("watch-fors only → 'What to watch for' block", () => {
  const out = buildCarryForward({ watch_for: ["Whether the reorg anxiety resurfaces"] });
  assert.equal(
    out,
    [
      "Since last time (edit or clear this before you run):",
      "What to watch for:",
      "- Whether the reorg anxiety resurfaces",
    ].join("\n"),
  );
});

test("both sections render, agreed first then watch", () => {
  const out = buildCarryForward({
    next_actions: [{ when: "next 1:1", action: "Revisit the promotion timeline" }],
    watch_for: ["Is the extra scope sustainable?"],
  });
  assert.equal(
    out,
    [
      "Since last time (edit or clear this before you run):",
      "What you agreed:",
      "- next 1:1: Revisit the promotion timeline",
      "What to watch for:",
      "- Is the extra scope sustainable?",
    ].join("\n"),
  );
});
