import { test } from "node:test";
import assert from "node:assert/strict";
import { renderAxisMemory, type AxisRead } from "./person-axes.ts";

// Helper: a run's axes with a given read for each of the four axes. Pass a
// number for a read score, or null for "not read".
function run(w: number | null, e: number | null, c: number | null, g: number | null): AxisRead[] {
  const cell = (id: string, v: number | null): AxisRead =>
    v === null ? { id, score: null, read_status: "not_read" } : { id, score: v, read_status: "read" };
  return [cell("wellbeing", w), cell("engagement", e), cell("clarity", c), cell("growth", g)];
}

test("multiple runs draw a trend oldest→newest for a read axis", () => {
  // engagement: -1 (oldest) → +3 → +6 (newest)
  const html = renderAxisMemory([run(null, -1, null, null), run(null, 3, null, null), run(null, 6, null, null)]);
  assert.match(html, /Engagement<\/span><span class="axis-mem__series"><b>-1<\/b>.*<b>\+3<\/b>.*<b>\+6<\/b>/s);
});

test("an axis never read in any run shows 'not read', never a 0", () => {
  const html = renderAxisMemory([run(null, 6, null, null), run(null, 3, null, null)]);
  assert.match(html, /Wellbeing<\/span><span class="axis-mem__nr">not read<\/span>/);
  assert.doesNotMatch(html, /Wellbeing<\/span>.*<b>0<\/b>/s);
});

test("only sessions that read the axis contribute a point", () => {
  // clarity read only in the middle run → single point, not three
  const html = renderAxisMemory([run(null, null, null, null), run(null, null, -4, null), run(null, null, null, null)]);
  assert.match(html, /Clarity<\/span><span class="axis-mem__series"><b>-4<\/b><\/span>/);
});

test("a genuinely read score of 0 shows '0' — a read zero is real signal", () => {
  const html = renderAxisMemory([run(null, null, 0, null)]);
  assert.match(html, /Clarity<\/span><span class="axis-mem__series"><b>0<\/b><\/span>/);
});

test("a single run still renders (one point per read axis)", () => {
  const html = renderAxisMemory([run(-2, 6, null, null)]);
  assert.match(html, /Wellbeing<\/span><span class="axis-mem__series"><b>-2<\/b><\/span>/);
  assert.match(html, /Engagement<\/span><span class="axis-mem__series"><b>\+6<\/b><\/span>/);
  assert.match(html, /Clarity<\/span><span class="axis-mem__nr">not read<\/span>/);
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
  assert.match(html, /Engagement<\/span><span class="axis-mem__series"><b>\+5<\/b><\/span>/);
});
