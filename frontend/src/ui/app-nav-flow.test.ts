import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isRailFreeStage } from "../router.js";
import { STAGES } from "../../../admin/src/state.ts";

// Guard for the rail-free 1:1 lane (audit F13, 2026-07-25). Setting up or running a
// 1:1 used to keep the manager's left rail, so two navigations competed during the
// one focused task — a guest already got the whole width because they have no rail.
// The change has three halves and any one of them alone leaves it half-done: the
// stage set, the nav's early return, and the topbar gutter that has to collapse with
// the rail (otherwise the bar hangs 248px off the left edge).

const navJs = readFileSync(new URL("./app-nav.js", import.meta.url), "utf8");
const appNavCss = readFileSync(
  new URL("../../../admin/src/styles/design/app-nav.css", import.meta.url),
  "utf8",
);
const primitivesCss = readFileSync(
  new URL("../../../admin/src/styles/design/primitives.css", import.meta.url),
  "utf8",
);

test("isRailFreeStage: setup and every run stage, and nothing else", () => {
  for (const s of [STAGES.INTAKE, STAGES.FOCUS_POINTS, STAGES.PREPARATION, STAGES.BANK,
    STAGES.QUESTIONING, STAGES.EVAL, STAGES.BRIEFING, STAGES.RUN_DEBRIEF]) {
    assert.equal(isRailFreeStage(s), true, `${s} runs without the rail`);
  }
  // The list and content screens keep it — that's where navigating IS the job.
  for (const s of [STAGES.START, STAGES.TEAM, STAGES.RUNS, STAGES.MEMBERS,
    STAGES.MEMBER_HOME, STAGES.GUIDED, STAGES.ABOUT, STAGES.FEEDBACK]) {
    assert.equal(isRailFreeStage(s), false, `${s} keeps the rail`);
  }
});

test("the customer rail hides itself in the lane whether or not you're signed in", () => {
  // The old guard was `!user && isGuestStage(stage)` — signed in, the rail stayed.
  assert.match(navJs, /\|\| isRailFreeStage\(stage\)\) \{/, "the lane is in the hide guard");
  assert.doesNotMatch(navJs, /!user && isGuestStage/, "no signed-in carve-out left");
  assert.match(
    navJs,
    /isRailFreeStage\(stage\)\) \{[\s\S]{0,400}?document\.body\.classList\.remove\("has-app-nav"\)/,
    "hiding the rail also drops the body's rail gutter",
  );
});

test("CSS: the rail gutter collapses to zero when there is no rail", () => {
  assert.match(
    appNavCss,
    /body:not\(\.has-app-nav\) \{\s*--app-nav-w-now: 0px;/,
    "no rail means no gutter, so the session topbar starts at the left edge",
  );
});

test("CSS: a header that opens with its title row clears the signed-in chip (F4)", () => {
  // The chip is fixed at top:12px and 39px tall. With no eyebrow above it, the
  // title row starts at the top of the content area and its right-hand action
  // landed under the chip: elementFromPoint at the button's top corners answered
  // .profile-badge, not the button.
  assert.match(
    primitivesCss,
    /\.page-header:first-child > \.page-header__row:first-child \{\s*margin-top:/,
    "the header reserves the chip's band when it has no eyebrow",
  );
});
