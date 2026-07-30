// Guard for the softened finish prompt (machar-fixes P1).
//
// Carl caught this live over the first corridor manager's shoulder: "see that QA prompt.
// We don't need that QA prompt. That's for me." It was three labelled sections with button
// rows, which is what made it read as an internal form rather than as Sero asking one thing.
//
// Two things must not drift back:
//   1. It stays ONE question. Re-stacking sections rebuilds the form Carl rejected.
//   2. The verdict question survives. It is the corridor test's only automatic read on
//      whether a tester would come back, so "tidying" it away would silently remove the
//      pass-bar instrument (docs/reference/gtm-validation-plan.md).
//
// There is no DOM in this test runner (node:test, no jsdom), so this is a source-reading
// guard in the same shape as modal-shell.test.ts. The rendered card and the inbox row are
// verified in the browser as part of the phase walk.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const here = (rel: string) => new URL(rel, import.meta.url);
const read = (rel: string) => readFileSync(here(rel), "utf8");

// Comments are stripped before matching: the module's own header explains WHICH questions
// were dropped and why, so a raw substring search would fire on the explanation itself.
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const MODAL = stripComments(read("./finish-feedback-modal.js"));
const CSS = stripComments(read("../styles/finish-feedback-modal.css"));
const TYPE_CSS = stripComments(read("../styles/design/type.css"));

test("the pass-bar question survives", () => {
  assert.match(
    MODAL,
    /Would you use this before your next 1:1\?/,
    "The verdict question is the corridor test's only automatic return-intent signal. Do not remove it.",
  );
  assert.match(
    MODAL,
    /submitRunVerdict/,
    "The verdict must still be saved, or the question is decoration.",
  );
});

test("it asks one question, not a form", () => {
  for (const dropped of [
    "Did the prep give you something useful?",
    "Where did you get stuck or confused?",
  ]) {
    assert.ok(
      !MODAL.includes(dropped),
      `"${dropped}" is back. The three-question stack is what read as an internal QA form.`,
    );
  }
  assert.ok(
    !/class="eyebrow"/.test(MODAL),
    "Small-caps eyebrow labels are back. A question is asked at reading size, not labelled like a field.",
  );
  assert.ok(
    !/ffm__sec/.test(MODAL) && !/\.ffm__sec/.test(CSS),
    "The multi-section rhythm is back. One flex column, one question.",
  );
  // The question's size used to be declared here. Type-system P4 grouped .ffm__q into
  // .type-heading-xs in design/type.css instead, because finish-feedback-modal.css is
  // code-split and a size left in it would beat the role. So the guard follows the
  // rule to where it now lives: the question must still be reading size somewhere, and
  // a rule back in this sheet would silently un-apply the role.
  assert.match(TYPE_CSS, /\.ffm__q\b/, "The question needs its reading-size role in type.css.");
  // Every type property, not just the size. The failure this describes ("a rule back
  // in this sheet would silently un-apply the role") works exactly as well through a
  // weight, a family or a leading: the local value wins and the role delivers only the
  // properties the sheet did not name. Banning font-size alone caught a third of it
  // (P5, after a P4 review).
  const stray = /(?:^|[;{]|\s)(font-size|font-weight|font-family|line-height|letter-spacing|text-transform|font-variant-numeric|font)\s*:/.exec(
    CSS.replace(/\/\*[\s\S]*?\*\//g, ""),
  );
  assert.equal(
    stray?.[1],
    undefined,
    `finish-feedback-modal.css declares ${stray?.[1]} again. It loads after type.css, so that beats the role and half-applies it.`,
  );
});

test("no rating is invented from the verdict", () => {
  // The dropped question doubled as the star rating (Yes/Sort of/No -> 5/3/1). Deriving
  // stars from "would you use this again" would be making a rating up; rating stays a
  // deliberate act on the run detail screen instead.
  assert.ok(
    !/rateMyRun/.test(MODAL),
    "The finish prompt is rating runs again. If a rating is wanted here, ask for it plainly.",
  );
  assert.ok(
    !/STARS_FOR|usefulFromStars/.test(MODAL),
    "A verdict-to-stars mapping is back. That fabricates a rating the manager never gave.",
  );
});

test("every way out still lets Finish proceed", () => {
  // Any exit that fails to resolve would strand the manager on the briefing.
  for (const hook of ["js-ffm-skip", "js-ffm-done"]) {
    assert.ok(MODAL.includes(hook), `${hook} is missing; the card would have no way out.`);
  }
  assert.match(MODAL, /onClose:\s*\(\)\s*=>\s*close\(\)/, "Escape and the backdrop must resolve too.");
  assert.match(MODAL, /function close\(\)\s*\{\s*shell\.destroy\(\);\s*resolve\(\);/, "close() must resolve the promise.");
});
