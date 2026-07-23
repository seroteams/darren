import { test } from "node:test";
import assert from "node:assert/strict";
import { renderAxisMemory, type AxisRead } from "./person-axes.ts";

// Axis memory, re-rendered as the shared axis bars (design-consolidation Phase 1, M5):
// each read axis shows its CURRENT (newest) value as the same .axis bar the briefing
// uses, with the older reads as a quiet text suffix. axes.js itself needs a DOM, so
// this module replicates its exact classes as a pure string — asserted here.

// Helper: a run's axes with a given read for each of the four axes. Pass a
// number for a read score, or null for "not read".
function run(w: number | null, e: number | null, c: number | null, g: number | null): AxisRead[] {
  const cell = (id: string, v: number | null): AxisRead =>
    v === null ? { id, score: null, read_status: "not_read" } : { id, score: v, read_status: "read" };
  return [cell("wellbeing", w), cell("engagement", e), cell("clarity", c), cell("growth", g)];
}

test("the newest read renders as the shared axis bar with its current value", () => {
  // engagement: -1 (oldest) → +3 → +6 (newest) — the bar shows +6, full positive fill
  const html = renderAxisMemory([run(null, -1, null, null), run(null, 3, null, null), run(null, 6, null, null)]);
  assert.match(html, /<div class="axis" data-axis="engagement">/);
  assert.match(html, /axis__fill axis__fill--positive" style="transform: scaleX\(1\)"/);
  assert.match(html, /role="meter" aria-valuemin="-6" aria-valuemax="6" aria-valuenow="6" aria-label="Engagement score"/);
  assert.match(html, /axis__value num-tabular">\+6</);
});

test("older reads ride as a quiet suffix, oldest → newest", () => {
  const html = renderAxisMemory([run(null, -1, null, null), run(null, 3, null, null), run(null, 6, null, null)]);
  assert.match(html, /axis-mem__nr">last 3 reads: -1 → \+3 → \+6</);
});

test("a single read shows the bar alone, no history suffix", () => {
  const html = renderAxisMemory([run(-2, null, null, null)]);
  assert.match(html, /<div class="axis" data-axis="wellbeing">/);
  assert.match(html, /axis__fill--negative/);
  assert.doesNotMatch(html, /last \d+ reads/);
});

test("an axis never read in any run shows 'not read': no bar, never a 0", () => {
  const html = renderAxisMemory([run(null, 6, null, null), run(null, 3, null, null)]);
  assert.match(html, /Wellbeing<\/div><span class="axis-mem__nr">not read<\/span>/);
  // Only the read axis gets a meter — an unread axis never fakes a bar.
  assert.equal((html.match(/role="meter"/g) || []).length, 1);
});

test("only sessions that read the axis contribute a point", () => {
  // clarity read only in the middle run → one point: a bar, no suffix
  const html = renderAxisMemory([run(null, null, null, null), run(null, null, -4, null), run(null, null, null, null)]);
  assert.match(html, /aria-valuenow="-4" aria-label="Clarity score"/);
  assert.match(html, /axis__value num-tabular">-4</);
  assert.doesNotMatch(html, /last \d+ reads/);
});

test("a genuinely read score of 0 is a real bar at the midline, not 'not read'", () => {
  const html = renderAxisMemory([run(null, null, 0, null)]);
  assert.match(html, /aria-valuenow="0" aria-label="Clarity score"/);
  assert.match(html, /axis__value num-tabular">0</);
  assert.match(html, /style="transform: scaleX\(0\)"/);
  assert.doesNotMatch(html, /Clarity<\/div><span class="axis-mem__nr">not read/);
});

test("a beyond-scale score clamps the bar and says off-scale, true value kept", () => {
  const html = renderAxisMemory([run(8, null, null, null)]);
  assert.match(html, /axis__fill--positive" style="transform: scaleX\(1\)"/);
  assert.match(html, /aria-valuenow="8"/);
  assert.match(html, /\+8<span class="axis__offscale">\(off-scale\)<\/span>/);
});

test("nothing ever read → empty string (no empty scaffold)", () => {
  assert.equal(renderAxisMemory([run(null, null, null, null), run(null, null, null, null)]), "");
  assert.equal(renderAxisMemory([]), "");
  assert.equal(renderAxisMemory(undefined as unknown as AxisRead[][]), "");
});

test("axes render in the canonical wellbeing→engagement→clarity→growth order", () => {
  const html = renderAxisMemory([run(1, 2, 3, 4)]);
  const order = ["Wellbeing", "Engagement", "Clarity", "Growth"].map((l) => html.indexOf(l));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test("runs missing an axes array are skipped, not crashed on", () => {
  const html = renderAxisMemory([null, run(null, 5, null, null), undefined]);
  assert.match(html, /aria-valuenow="5" aria-label="Engagement score"/);
  assert.doesNotMatch(html, /last \d+ reads/);
});
