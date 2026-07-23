import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// briefing.js renders through the DOM, so this guard reads the source instead —
// the same approach as preparation-css.test.ts. It locks the shape Carl signed
// off on screen (2026-07-17), plus the Phase 4 instant-render + calmer-grammar
// pass (audit F7), so a later edit can't quietly undo either.
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, "briefing.js"), "utf8");
const CSS = readFileSync(join(here, "../styles/design/briefing.css"), "utf8");

test("the Recap renders as three acts, in order", () => {
  const acts = ["What came out", "The honest read", "What to do next"];
  const positions = acts.map((label) => SRC.indexOf(`recap-act__label">${label}<`));
  positions.forEach((pos, i) => assert.ok(pos > -1, `act present: ${acts[i]}`));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "acts render in narrative order");
});

test("the payoff act keeps its own ground, in the house card-flat grammar", () => {
  assert.ok(SRC.includes("recap-act--payoff"), "payoff act exists");
  // Phase 4 (F7): the bespoke lifted frame converged on briefing-view's card-flat
  // recipe — same surface language as every other read-only briefing section.
  assert.ok(!SRC.includes("recap-payoff-frame"), "the invented lift frame is gone from the markup");
  assert.ok(!CSS.includes(".recap-payoff-frame"), "the lift frame CSS is gone with it");
  // No nested cards: the working columns sit directly in the flat ground.
  assert.ok(!SRC.includes(`class="card actions-host"`), "actions-host is not a nested card");
  assert.ok(!SRC.includes(`class="card watch-host"`), "watch-host is not a nested card");
});

// --- Phase 4 (audit F7): the recap renders in one pass. The 2s staged reveal
// choreography (sequential awaits, PACE scaling, fail-open catch) is gone; the
// whole page arrives at once behind ONE soft fade, wash kept as a moment.

test("instant render: no staged choreography survives", () => {
  assert.ok(!SRC.includes("revealSequence"), "no reveal sequences");
  assert.ok(!SRC.includes("sleep"), "no sleep pacing");
  assert.ok(!SRC.includes("PACE"), "no pace scaling");
  assert.ok(!SRC.includes("await pause"), "no awaited beats between sections");
  assert.ok(!SRC.includes("fail open"), "the fail-open catch died with the choreography");
});

test("instant render: one soft fade of the whole page, wash kept as a moment", () => {
  assert.ok(/class="[^"]*recap-page[^"]*reveal-soft[^"]*"/.test(SRC) || /class="[^"]*reveal-soft[^"]*recap-page[^"]*"/.test(SRC),
    "the page container carries the single soft fade");
  const fades = SRC.match(/revealOne\(/g) || [];
  assert.equal(fades.length, 1, "exactly one fade call: the page, not per-section beats");
  assert.ok(SRC.includes("celebration-wash"), "the celebration wash survives");
  assert.ok(/if \(!fastPath\)/.test(SRC), "rehydrated tabs still skip the wash");
});

test("grammar convergence: section hosts use the card-flat recipe, like briefing-view", () => {
  assert.ok(SRC.includes(`class="card-flat bullets-host"`), "bullets host is card-flat");
  assert.ok(SRC.includes(`class="card-flat axes-mount"`), "axes host is card-flat");
  assert.ok(SRC.includes(`class="card-flat engagement-host"`), "engagement host is card-flat");
  assert.ok(!CSS.includes("opacity: 0;\n}") || !/\.brutal\s*\{[^}]*opacity:\s*0/.test(CSS),
    "brutal cards are visible by default, not parked at opacity 0");
});

test("one sticky wizard footer at the bottom of the page column", () => {
  // The footer renders as a direct child of the page, after the finish block,
  // so position: sticky can pin it to the viewport bottom.
  const lastFooterClose = SRC.indexOf("</footer>");
  const wizardCall = SRC.lastIndexOf("wizardFooter(");
  assert.ok(lastFooterClose > -1 && wizardCall > lastFooterClose, "wizard footer sits outside the finish block");
  assert.ok(/\.recap-page\s*>\s*\.wizard-footer\s*\{[^}]*position:\s*sticky/.test(CSS), "footer is sticky");
  assert.ok(/\.recap-page\s*>\s*\.wizard-footer\s*\{[^}]*bottom:\s*0/.test(CSS), "pinned to the viewport bottom");
  assert.ok(/\.recap-page\s*>\s*\.wizard-footer\s*\{[^}]*background/.test(CSS), "opaque so content scrolls under, not through");
});

test("engine honesty: the hero is the engine's own headline, never a client rewrite", () => {
  assert.ok(SRC.includes('b.headline || "Recap"'), "headline comes straight from the engine");
});

test("the 'Partial record' chip is earned from read_status, never invented", () => {
  assert.ok(SRC.includes("Partial record"), "the chip exists");
  assert.ok(SRC.includes("anyAxisRead"), "gated on whether any axis was actually read");
  // The chip must be conditional — a chip that always shows would be a false claim.
  assert.ok(/if \(!anyAxisRead[^)]*\)/.test(SRC), "chip only renders when no axis was read");
});

test("honest reads stay split. Shareable vs private", () => {
  assert.ok(SRC.includes("brutal--private"), "the private variant survives");
  assert.ok(SRC.includes("Don't paste this into shared notes"), "the private warning survives");
  assert.ok(/\.brutal\s*\{[^}]*--sero-mint-100/.test(CSS), "shareable reads mint");
  assert.ok(/\.brutal--private\s*\{[^}]*--sero-gold-100/.test(CSS), "private reads gold");
});

// --- Promises before the recap (signed off 2026-07-19): the agreement step is
// its own full-screen view AHEAD of the recap, not a card inside it.

test("the promises step renders before any recap, and gates correctly", () => {
  const gate = SRC.indexOf("const showPromises");
  const wash = SRC.indexOf("celebration-wash");
  assert.ok(gate > -1, "the view picker exists");
  assert.ok(wash > -1, "the wash survives");
  assert.ok(gate < wash, "the promises step is decided before the recap wash plays");
  assert.ok(SRC.includes("renderPromiseAgree"), "the dedicated step renders");
  // Gate contract: scripted lane, Q9 skip, and an already-locked run bypass the
  // step — but NOT guests (no store.user in the gate; guests agree promises too).
  const gateExpr = SRC.slice(gate, SRC.indexOf(";", gate));
  assert.ok(gateExpr.includes("!store.scripted"), "scripted lane never sees the step");
  assert.ok(gateExpr.includes("!store.promisesConfirmSkip"), "Q9 skip bypasses the step");
  assert.ok(gateExpr.includes("!store.promisesConfirmed"), "locked runs go straight to the recap");
  assert.ok(!gateExpr.includes("store.user"), "guests get the step too");
});

test("the recap band shows what was AGREED, with suggestions only as a labelled fallback", () => {
  assert.ok(SRC.includes("store.promises"), "the locked list drives the band");
  const agreedIdx = SRC.indexOf("agreed.filter((p) => p.owner");
  const fallbackIdx = SRC.indexOf(`.textContent = "Sero's suggestions"`);
  assert.ok(agreedIdx > -1, "agreed promises render grouped by owner");
  assert.ok(fallbackIdx > -1, "unlocked runs label the list as Sero's suggestions, never as agreed");
  assert.ok(SRC.includes(`"You promised"`), "manager group labelled");
  assert.ok(SRC.includes("You promised") && agreedIdx < fallbackIdx, "agreed list is preferred over the fallback");
});

test("empty acts remove themselves rather than orphan a label", () => {
  assert.ok(SRC.includes(`.recap-act--honest")?.remove()`), "honest act self-removes when empty");
  assert.ok(SRC.includes(`.recap-act--payoff")?.remove()`), "payoff act self-removes when empty");
});
