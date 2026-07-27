// Stage look-back (stage-back-nav P1). The contract worth guarding is a
// behavioural one, not a visual one: clicking a finished step must never move
// the RUN backwards. It moves the user to a separate look-back screen, and the
// run's own position is parked in `lookbackReturn` so the rail keeps drawing
// real progress.
//
// Source-level assertions, matching the house style in session-topbar.test.ts:
// these modules pull in Vite-only CSS imports and lucide, so importing them in
// a plain Node test would need a bundler.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const TOPBAR = read("./session-topbar.js");
const LOOKBACK = read("../stages/stage-lookback.js");
const SECTIONS = read("./stage-recap-sections.js");
const STATE = read("../state.ts");
const LOADERS = read("../stage-loaders.js");

test("the old review overlay is gone, popup and all", () => {
  assert.ok(!TOPBAR.includes("createStageReview"), "the top bar still opens the review overlay");
  assert.ok(!TOPBAR.includes("stage-review.js"), "the top bar still imports the deleted overlay");
  assert.throws(
    () => read("./stage-review.js"),
    "ui/stage-review.js should be deleted, not left orphaned",
  );
});

test("clicking a finished step navigates to the look-back screen, never to the stage itself", () => {
  // The whole point: the run's `stage` may only ever become STAGE_LOOKBACK here.
  // A bare `stage: key` would drop the user back into a live stage module, which
  // for BANK/QUESTIONING/EVAL auto-advances and would wreck the run.
  assert.match(TOPBAR, /stage: STAGES\.STAGE_LOOKBACK/, "the click handler must route to the look-back stage");
  assert.match(TOPBAR, /lookbackStage: key/, "the clicked stage must be recorded");
  assert.ok(
    !/setState\(\{\s*stage: key\b/.test(TOPBAR),
    "the top bar must never set the run's stage to the clicked step",
  );
});

test("the return point is the live stage, not whatever screen we are on", () => {
  // Reading `stage` here would park STAGE_LOOKBACK as the return point the moment
  // you hopped from one look-back to another, and the Back button would loop.
  assert.match(TOPBAR, /lookbackReturn: current/, "lookbackReturn must come from the resolved live stage");
});

test("the rail keeps drawing the run's real progress while looking back", () => {
  assert.match(TOPBAR, /viewing \? lookbackReturn \|\| stage : stage/, "curIdx must derive from the live stage");
  assert.match(TOPBAR, /is-viewing/, "the step being viewed needs its own marker");
});

test("the live step is pressable while looking back, so the rail is a way home", () => {
  assert.match(TOPBAR, /viewing && status === "current"/);
});

test("the look-back screen re-enters no stage module and opens no stream", () => {
  for (const forbidden of ["openSse", "/stream", "regenerate", "startSession"]) {
    assert.ok(!LOOKBACK.includes(forbidden), `stage-lookback.js must not reference ${forbidden}`);
  }
  // getRunFull is a plain read, and the only network call it is allowed to make.
  const calls = LOOKBACK.match(/\b(get|post|put|patch|delete)[A-Z]\w*\(/g) || [];
  assert.deepEqual([...new Set(calls)], ["getRunFull("], "the look-back screen may only read the run");
});

test("the recap renderers stay pure: no DOM, no fetching, no setState", () => {
  // Call forms, not bare words: the module's own header comment says "no setState".
  for (const forbidden of ["document.", "setState(", "fetch(", "addEventListener("]) {
    assert.ok(!SECTIONS.includes(forbidden), `stage-recap-sections.js must not use ${forbidden}`);
  }
});

test("every step in the breadcrumb has something to show", () => {
  // A step with no renderer would open a blank screen. The rail's seven keys and
  // the renderers must stay in step.
  const labels = read("./stage-labels.js");
  const keys = [...labels.matchAll(/\["([A-Z_]+)",\s*"/g)].map((m) => m[1]);
  assert.ok(keys.length >= 7, "could not read the breadcrumb stage keys");
  for (const key of keys) {
    assert.ok(new RegExp(`^  ${key}\\(`, "m").test(SECTIONS), `no look-back renderer for ${key}`);
  }
});

test("the look-back position is cleared by resetSession", () => {
  // Both keys must sit in `initial` — resetSession only resets what is listed
  // there, so a stray lookbackStage would leak into the next run in the tab.
  const initial = STATE.slice(STATE.indexOf("const initial = {"), STATE.indexOf("} satisfies"));
  assert.match(initial, /lookbackStage: null/);
  assert.match(initial, /lookbackReturn: null/);
});

test("the look-back stage is registered and has no url of its own", () => {
  assert.match(LOADERS, /STAGE_LOOKBACK:\s*\(\) => import\("\.\/stages\/stage-lookback\.js"\)/);
  assert.match(STATE, /STAGE_LOOKBACK: "STAGE_LOOKBACK"/);
  // Deliberate: with no PATH_FOR entry the address bar keeps pointing at the live
  // stage, so a reload lands on the run rather than on a look-back screen.
  const router = read("../router.js");
  assert.ok(!router.includes("STAGE_LOOKBACK"), "STAGE_LOOKBACK should have no route yet");
});
