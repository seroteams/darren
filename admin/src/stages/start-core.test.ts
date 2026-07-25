import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// start-core.js mounts through the DOM and imports CSS, so this guard reads the
// source instead (same approach as briefing-structure.test.ts). It locks the
// design-consolidation Phase 1 shape for Home (audit M1 + M2): rich rows in one
// card, direct row-open, shared page header, no accordion.
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, "start-core.js"), "utf8");
const CSS = readFileSync(join(here, "../styles/design/start-stage.css"), "utf8");

test("the expand-in-place accordion is gone", () => {
  assert.ok(!SRC.includes("aria-expanded"), "no expandable row head");
  assert.ok(!SRC.includes("expandedId"), "no expanded-row state");
  assert.ok(!SRC.includes("js-body"), "no fold-out body");
  assert.ok(!SRC.includes("getRunOverview"), "no per-row overview fetch on expand");
});

test("no text glyphs: chevrons and their styles are deleted, icons stay Lucide", () => {
  assert.ok(!SRC.includes("▼") && !SRC.includes("▶"), "no text chevrons in the source");
  assert.ok(!CSS.includes("run-row__chevron"), "chevron style deleted from start-stage.css");
  assert.ok(SRC.includes("MoreHorizontal"), "the row menu keeps its Lucide glyph");
});

test("recents render as rich rows: avatar initial, bold name, quiet type-and-time line", () => {
  assert.ok(SRC.includes("ds-avatar"), "shared avatar circle");
  assert.ok(SRC.includes("run-list__name"), "bold headline slot");
  assert.ok(SRC.includes("run-list__sub"), "quiet second line slot");
  assert.ok(/\.run-list__name\s*\{[^}]*semibold/.test(CSS), "name reads bold");
  assert.ok(/\.run-list__sub\s*\{[^}]*ink-dim/.test(CSS), "second line reads quiet");
});

// home-screen-truth Phase 1. The row copy moved into start-rows.ts so it could be
// tested for real; what this guard holds is that start-core can't quietly reintroduce
// the headline blob (whose seniority slot has been seen carrying an email address).
test("the row name comes from the tested row model, never the headline blob", () => {
  assert.ok(/import \{ rowModel, orderForHome, hasRealRuns \}/.test(SRC), "rows are built by start-rows.ts");
  assert.ok(!/r\.headline/.test(SRC), "no headline fallback anywhere in the screen");
  assert.ok(!SRC.includes("formatRelativeTime"), "the duplicated time helper is gone (ui/time.ts owns it)");
});

test("an unfinished prep is marked and hoisted, and 5 are fetched to find it", () => {
  assert.ok(/listRecentRuns\(5\)[\s\S]{0,120}orderForHome\([^)]*3\)/.test(SRC), "fetch 5, render the top 3");
  assert.ok(SRC.includes("Half done"), "the unfinished state is named on the row");
  assert.ok(/statusChip[\s\S]{0,200}status === "open"/.test(SRC), "only unfinished rows get the chip");
  assert.ok(/\.run-list__status\s*\{[^}]*--type-body-sm/.test(CSS), "the chip respects the 14px floor");
});

test("the internal review chip stays out of the customer view", () => {
  const chip = SRC.slice(SRC.indexOf("function reviewChip"));
  assert.ok(/isInternalAdmin\(store\.user\)/.test(chip.slice(0, 200)), "reviewChip is gated on internal admin");
});

test("a failed load says so instead of rendering the first-run card", () => {
  assert.ok(SRC.includes("errorCardHtml") && SRC.includes("wireRetry"), "the shared error card is used");
  assert.ok(SRC.includes("Couldn't load your 1:1s"), "it names what failed");
  const load = SRC.slice(SRC.indexOf("async function load"));
  assert.ok(/catch[\s\S]{0,200}renderError\(\)[\s\S]{0,40}return/.test(load), "a catch renders the error and stops");
});

test("a row click opens the run directly, keeping the resume-vs-review decision", () => {
  assert.ok(SRC.includes("js-open"), "whole row is the open target");
  const open = SRC.slice(SRC.indexOf("function openRun"));
  assert.ok(open.includes('"BRIEFING"'), "finished runs are detected");
  assert.ok(open.includes("review(") && open.includes("resume("), "finished → review, unfinished → resume");
});

test("the per-row overflow menu keeps Delete behind a confirm", () => {
  assert.ok(SRC.includes("openRowMenu"), "the shared row menu is used");
  assert.ok(SRC.includes("Delete 1:1"), "delete lives in the menu");
  assert.ok(SRC.includes("confirmAction"), "delete still asks first");
});

test("a quiet see-all link routes to the Past 1:1s stage", () => {
  assert.ok(SRC.includes("See all past 1:1s"), "link copy");
  assert.ok(/js-see-all[\s\S]*STAGES\.RUNS/.test(SRC), "routes to the RUNS stage");
});

test("the page header is the shared pageHeader() with the one accent action", () => {
  assert.ok(SRC.includes("pageHeader("), "shared header contract");
  assert.ok(SRC.includes("Prep a 1:1"), "page title kept");
  assert.ok(/actionsHtml[\s\S]{0,140}js-startnew/.test(SRC), "Start a new 1:1 sits in the header actions");
  const accents = SRC.match(/class="btn js-/g) || [];
  assert.equal(accents.length, 1, "exactly one solid accent button in this screen's own markup");
});

test("layout: one clean stack at the medium container width", () => {
  assert.ok(SRC.includes("stage-medium"), "medium width container");
  assert.ok(!SRC.includes("stage-inner"), "old narrow container gone");
});

test("Enter still starts a new 1:1; accordion-only shortcuts are gone", () => {
  assert.ok(/"Enter"[\s\S]{0,80}startNew\(\)/.test(SRC), "Enter = start a new 1:1");
  assert.ok(!SRC.includes('"Escape"'), "Escape collapse removed with the accordion");
  assert.ok(!/key\.toLowerCase\(\) === "r"/.test(SRC), "r-to-resume removed with the accordion");
});

// A manager whose preps have all aged past the 7-day session TTL can click several
// dead rows in a row. Each used to heal in place, leaving three identical recovery
// cards, three blue buttons (DESIGN rule 3), and no rows left to click.
test("only one stale-resume recovery card can be on screen at a time", () => {
  const resume = SRC.slice(SRC.indexOf("async function resume"), SRC.indexOf("function startFreshWith"));
  assert.ok(/rehydrateById[\s\S]*render\(\)[\s\S]*staleRunRecoveryHtml/.test(resume), "a failed resume re-renders the rows before healing one");
});

test("empty, loading and failed-resume states survive the new layout", () => {
  assert.ok(SRC.includes("firstVisitHtml"), "the first-visit welcome is the zero-run state");
  assert.ok(SRC.includes("createSkeleton"), "loading skeleton kept");
  assert.ok(SRC.includes("staleRunRecoveryHtml"), "failed resume heals in place");
});

// home-screen-truth Phase 2. The first-visit block has its own section outside the
// recents <ul>; injected as an <li> it would have put a card inside the list card
// (DESIGN rule 10), which is what the original invitation card did.
test("the first-visit block is a sibling of the list, never a cell inside it", () => {
  assert.ok(SRC.includes("js-welcome"), "the block has its own section");
  assert.ok(!SRC.includes("start-firstrun-cell"), "the <li> host is gone");
  assert.ok(!CSS.includes(".start-firstrun-cell"), "its style is gone too");
  assert.ok(/welcomeHost\.innerHTML = firstVisitHtml/.test(SRC), "it renders into that section");
});

// onboarding-firstrun Phase 2 (Direction A). "Work / Prep a 1:1" and a recents list both
// assume the visitor already knows what Sero is; on a first visit they step aside for one
// screen that shows a finished brief before asking for any typing.
test("a first visit replaces the page header and the recents list, and restores them for a returning manager", () => {
  assert.ok(/const firstRun = !hasRealRuns\(runs\) && !bench/.test(SRC), "the shared real-runs rule decides it, and the admin console never gets the customer welcome");
  assert.ok(/header\.hidden = firstRun/.test(SRC), "the standard header steps aside");
  assert.ok(/recentSection\.hidden = firstRun/.test(SRC), "so does the recents section");
  const err = SRC.slice(SRC.indexOf("function renderError"));
  assert.ok(/header\.hidden = false[\s\S]{0,120}recentSection\.hidden = false/.test(err), "a failed load never greets a returning manager as a newcomer");
});

test("the seeded example is carried into the welcome, not dropped", () => {
  assert.ok(/firstVisitHtml\(\{ exampleRunId: runs\.find\(\(r\) => rowModel\(r\)\.isExample\)\?\.id \}\)/.test(SRC), "the example run's id reaches the sample card");
  assert.ok(/js-open-example[\s\S]{0,80}openRun/.test(SRC), "and its link opens the real run");
});

test("the walkthrough only loads when it is asked for", () => {
  assert.ok(!SRC.includes("youtube"), "no third-party URL in this screen's source");
  assert.ok(/js-play-video[\s\S]{0,120}videoIframeHtml\(\)/.test(SRC), "the player is built on the play click");
});

// onboarding-firstrun Phase 1: the rule moved into start-rows.ts (hasRealRuns) so Home
// and the intake wizard can never disagree again about what counts as a real 1:1.
test("the zero-run branch keys on the shared real-runs rule, so the seeded example doesn't stand in for a real 1:1", () => {
  assert.ok(/const firstRun = !hasRealRuns\(runs\)/.test(SRC), "the invitation keys on real 1:1s, not every row");
  assert.ok(!SRC.includes("realRuns"), "no local copy of the rule survives in this screen");
});

// home-screen-truth Phase 3.
test("the seeded example row says it is an example, to everyone", () => {
  assert.ok(SRC.includes(">Example<"), "the chip is rendered");
  assert.ok(/run-list__side">\$\{exampleChip\(m\)\}/.test(SRC), "it sits in the row's side slot");
  const chip = SRC.slice(SRC.indexOf("function exampleChip"), SRC.indexOf("function render"));
  assert.ok(!chip.includes("isInternalAdmin"), "NOT gated on internal admin: the customer is who needs to see it");
  assert.ok(/\.run-list__example\s*\{[^}]*--type-body-sm/.test(CSS), "the chip respects the 14px floor");
  assert.ok(!/\.run-list__example\s*\{[^}]*--color-accent/.test(CSS), "neutral, not accent: it labels the row, it doesn't sell it");
});

test("the ONE blue button moves into the welcome; no second button is ever created", () => {
  const accents = SRC.match(/class="btn js-/g) || [];
  assert.equal(accents.length, 1, "still exactly one accent button in this screen's markup");
  assert.ok(/slot\.appendChild\(startBtn\)/.test(SRC), "the existing node is moved, not re-rendered");
  assert.ok(SRC.includes("Prep your first 1:1"), "it says what it does for a newcomer");
  assert.ok(/headerActions\.appendChild\(startBtn\)/.test(SRC), "and moves back to the header once there are 1:1s");
});

test("the returning manager's header copy is unchanged", () => {
  assert.ok(SRC.includes("Pick up where you left off, or start a new one."), "returning lede kept");
  assert.ok(!SRC.includes("LEDE_FIRST_RUN"), "no runtime lede swap: a newcomer never sees this header at all");
});

test("the accordion CSS is deleted; the new list card recipe exists", () => {
  for (const cls of [".run-row__head", ".run-row__body", ".run-row__overview", ".run-row__actions"]) {
    assert.ok(!CSS.includes(cls), `${cls} deleted`);
  }
  assert.ok(CSS.includes(".run-list--card"), "one-card list surface");
  assert.ok(/\.run-list__item[^{]*\{[^}]*border-bottom/.test(CSS), "divider rows");
});
