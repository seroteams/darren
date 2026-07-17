import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// briefing.js renders through the DOM, so this guard reads the source instead —
// the same approach as preparation-css.test.ts. It locks the shape Carl signed
// off on screen (2026-07-17) so a later edit can't quietly undo the redesign.
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, "briefing.js"), "utf8");
const CSS = readFileSync(join(here, "../styles/design/briefing.css"), "utf8");

test("the Recap renders as three acts, in order", () => {
  const acts = ["What came out", "The honest read", "What to do next"];
  const positions = acts.map((label) => SRC.indexOf(`recap-act__label">${label}<`));
  positions.forEach((pos, i) => assert.ok(pos > -1, `act present: ${acts[i]}`));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "acts render in narrative order");
});

test("the payoff act is the elevated destination", () => {
  assert.ok(SRC.includes("recap-act--payoff"), "payoff act exists");
  assert.ok(SRC.includes("recap-payoff-frame"), "payoff sits in its own frame");
  assert.ok(/\.recap-payoff-frame\s*\{[^}]*--shadow-lift/.test(CSS), "the frame carries the lift");
  // No nested cards: the working columns sit directly in the frame.
  assert.ok(!SRC.includes(`class="card actions-host"`), "actions-host is not a nested card");
  assert.ok(!SRC.includes(`class="card watch-host"`), "watch-host is not a nested card");
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

test("honest reads stay split — shareable vs private", () => {
  assert.ok(SRC.includes("brutal--private"), "the private variant survives");
  assert.ok(SRC.includes("don't paste this into shared notes"), "the private warning survives");
  assert.ok(/\.brutal\s*\{[^}]*--sero-mint-100/.test(CSS), "shareable reads mint");
  assert.ok(/\.brutal--private\s*\{[^}]*--sero-gold-100/.test(CSS), "private reads gold");
});

test("one blue action: Finish yields to 'Lock these in' when it's on screen", () => {
  assert.ok(SRC.includes("hasLockAction"), "the lock-present flag exists");
  assert.ok(SRC.includes(`if (hasLockAction) finishBtn.classList.add("btn--ghost")`),
    "Finish steps down to ghost when the lock action is present");
});

test("empty acts remove themselves rather than orphan a label", () => {
  assert.ok(SRC.includes(`.recap-act--honest")?.remove()`), "honest act self-removes when empty");
  assert.ok(SRC.includes(`.recap-act--payoff")?.remove()`), "payoff act self-removes when empty");
});
