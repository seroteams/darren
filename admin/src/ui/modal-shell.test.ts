// Guard for the shared modal shell (component-consolidation P1).
//
// The bug this phase fixed was invisible on screen and only showed up on the keyboard:
// `getFocusables` had been copy-pasted five times with TWO different selector lists, so
// links, selects and textareas were reachable by Tab in some dialogs and skipped in
// others. Three overlays had no trap at all.
//
// There is no DOM in this test runner (node:test, no jsdom), so this is a source-reading
// guard in the same shape as design/chip-system.test.ts: it fails if anyone hand-rolls
// the pattern again, or narrows the selector list. Real keyboard behaviour is verified in
// the browser as part of the phase walk. Phase 8 generalises this into npm run lint:components.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const here = (rel: string) => new URL(rel, import.meta.url);
const read = (rel: string) => readFileSync(here(rel), "utf8");

const SHELL = read("./modal-shell.ts");

// Every module that used to hand-roll the open sequence, and must now ride the shell.
const REFITTED = [
  "confirm.js",
  "add-person-modal.ts",
  "delete-person-modal.ts",
  "invite-member-modal.ts",
  "give-access-modal.ts",
  "share-link-modal.ts",
  "finish-feedback-modal.js",
  // Own their own DOM, so they take attachModalBehaviour rather than openModalShell.
  "account-sheet.ts",
  "stage-review.js",
];

test("the focusable selector list is defined once, in the shell", () => {
  for (const name of REFITTED) {
    const src = read(`./${name}`);
    assert.ok(
      !/function getFocusables/.test(src),
      `${name} still defines its own getFocusables. Import it from modal-shell.ts instead.`,
    );
  }
});

test("the selector list is the WIDE one (the narrow copies were the bug)", () => {
  // Single-quoted in the source precisely because the selector itself contains "-1".
  const list = SHELL.match(/querySelectorAll<HTMLElement>\(\s*'([^']+)'/)?.[1];
  assert.ok(list, "could not find the focusable selector list in modal-shell.ts");
  for (const needed of ["[href]", "select:not([disabled])", "textarea:not([disabled])"]) {
    assert.ok(
      list.includes(needed),
      `the focusable list dropped ${needed}. That is exactly the drift this shell exists to stop.`,
    );
  }
  assert.ok(list.includes('[tabindex]:not([tabindex="-1"])'), "the list must skip tabindex -1");
});

test("only the shell creates a modal backdrop", () => {
  for (const name of REFITTED) {
    const src = read(`./${name}`);
    assert.ok(
      !/["'`]modal-backdrop["'`]/.test(src),
      `${name} builds its own .modal-backdrop. Use openModalShell() instead.`,
    );
  }
  assert.ok(SHELL.includes('"modal-backdrop"'), "modal-shell.ts should be the one that sets it");
});

test("every refitted module imports the shell", () => {
  for (const name of REFITTED) {
    const src = read(`./${name}`);
    assert.match(
      src,
      /from "\.\/modal-shell\.ts"/,
      `${name} does not import the shared modal shell.`,
    );
  }
});

test("no refitted module still hand-rolls its own Escape handler", () => {
  for (const name of REFITTED) {
    const src = read(`./${name}`);
    assert.ok(
      !/e\.key === "Escape"/.test(src),
      `${name} still handles Escape itself. The shell owns that key.`,
    );
  }
});

test("the shell restores focus to whatever opened the dialog", () => {
  assert.match(SHELL, /previouslyFocused/, "the shell must capture the trigger");
  assert.match(SHELL, /previouslyFocused\.focus\(\{ preventScroll: true \}\)/);
});

test("the shell exports both shapes", () => {
  for (const fn of ["openModalShell", "attachModalBehaviour", "getFocusables"]) {
    assert.match(SHELL, new RegExp(`export function ${fn}\\b`), `missing export: ${fn}`);
  }
});

test("the two overlays that own their DOM take the behaviour helper", () => {
  for (const name of ["account-sheet.ts", "stage-review.js"]) {
    assert.match(
      read(`./${name}`),
      /attachModalBehaviour\(/,
      `${name} should use attachModalBehaviour so Tab stops walking out behind it.`,
    );
  }
});
