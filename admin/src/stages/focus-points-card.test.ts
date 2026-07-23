import { test } from "node:test";
import assert from "node:assert/strict";
import {
  focusPointCardHtml,
  focusReason,
  evidenceTag,
  selectedNote,
} from "./focus-points-card.ts";

// Phase 3 (design-consolidation, audit F5): the focus list is checkbox-cards.
// Each card is a real toggle with checkbox semantics (role="checkbox" +
// aria-checked), a visible check mark slot, and the "N selected" note feeds
// the shared wizard footer live.

test("card renders checkbox semantics, unchecked by default", () => {
  const html = focusPointCardHtml({ id: "fp1", label: "Workload" }, 0);
  assert.match(html, /role="checkbox"/, "checkbox role");
  assert.match(html, /aria-checked="false"/, "starts unchecked");
  assert.match(html, /data-fp-id="fp1"/, "carries the id for the toggle hook");
  assert.match(html, /js-fp-toggle/, "toggle hook class");
  assert.match(html, /focus-point__check/, "visible check mark slot");
  assert.match(html, /type="button"/, "never submits a form");
});

test("card shows the 1-based number, label, first-sentence reason and evidence", () => {
  const html = focusPointCardHtml(
    { id: "a", label: "Delivery", reason: "Two things slipped. More detail here.", source: "signal", confidence: "high" },
    2,
  );
  assert.match(html, /focus-point__num">3</, "1-based number");
  assert.ok(html.includes("Delivery"), "label");
  assert.match(html, /focus-point__reason">Two things slipped\.</, "visible reason is the first sentence only");
  assert.match(html, /title="Two things slipped\. More detail here\."/, "full reason kept on the title attr");
  assert.ok(html.includes("from your note, clearly stated"), "evidence line");
});

test("card falls back label: label, then type, then id; escapes user text", () => {
  assert.ok(focusPointCardHtml({ id: "x", type: "growth" }, 0).includes("growth"), "type fallback");
  assert.ok(focusPointCardHtml({ id: "x" }, 0).includes(">x<"), "id fallback");
  const html = focusPointCardHtml({ id: "x", label: "<b>bad</b>" }, 0);
  assert.ok(!html.includes("<b>bad</b>"), "label escaped");
});

test("focusReason keeps the first sentence only, tolerates empty", () => {
  assert.equal(focusReason("One. Two."), "One.");
  assert.equal(focusReason("No terminator here"), "No terminator here");
  assert.equal(focusReason(""), "");
  assert.equal(focusReason(null), "");
});

test("evidenceTag wording per source and confidence", () => {
  assert.ok(evidenceTag({ id: "a", source: "signal", confidence: "high" }).includes("from your note, clearly stated"));
  assert.ok(evidenceTag({ id: "a", source: "signal" }).includes("from your note"));
  assert.ok(evidenceTag({ id: "a", source: "role" }).includes("common for this level"));
  assert.equal(evidenceTag({ id: "a" }), "");
});

test("selectedNote reads as the live footer count", () => {
  assert.equal(selectedNote(0), "0 selected");
  assert.equal(selectedNote(1), "1 selected");
  assert.equal(selectedNote(3), "3 selected");
});
