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
  assert.ok(/import \{ rowModel, orderForHome \}/.test(SRC), "rows are built by start-rows.ts");
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
  assert.ok(SRC.includes("firstRunIntroHtml"), "zero-run welcome card kept");
  assert.ok(SRC.includes("createSkeleton"), "loading skeleton kept");
  assert.ok(SRC.includes("staleRunRecoveryHtml"), "failed resume heals in place");
});

// home-screen-truth Phase 2. The invitation card used to be injected as an <li> inside
// the recents <ul>; once a row shows alongside it (Phase 3's example) the list card
// would have wrapped a .card-flat, which is a nested card (DESIGN rule 10).
test("the first-run card is a sibling of the list, never a cell inside it", () => {
  assert.ok(SRC.includes("js-firstrun"), "the card has its own section");
  assert.ok(!SRC.includes("start-firstrun-cell"), "the <li> host is gone");
  assert.ok(!CSS.includes(".start-firstrun-cell"), "its style is gone too");
  assert.ok(/firstRunHost\.innerHTML = firstRunIntroHtml/.test(SRC), "the card renders into that section");
});

test("the zero-run branch keys on realRuns, so the seeded example doesn't stand in for a real 1:1", () => {
  assert.ok(/const realRuns = runs\.filter\(\(r\) => !rowModel\(r\)\.isExample\)/.test(SRC), "the example is not a real 1:1");
  assert.ok(/const firstRun = realRuns\.length === 0/.test(SRC), "the invitation keys on real 1:1s, not every row");
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

test("the ONE blue button moves into the card; no second button is ever created", () => {
  const accents = SRC.match(/class="btn js-/g) || [];
  assert.equal(accents.length, 1, "still exactly one accent button in this screen's markup");
  assert.ok(/slot\.appendChild\(startBtn\)/.test(SRC), "the existing node is moved, not re-rendered");
  assert.ok(SRC.includes("Start your first 1:1"), "it says what it does for a newcomer");
  assert.ok(/headerActions\.appendChild\(startBtn\)/.test(SRC), "and moves back to the header once there are 1:1s");
});

test("the lede stops promising a pick-up to someone with nothing to pick up", () => {
  assert.ok(SRC.includes("Pick up where you left off, or start a new one."), "returning copy kept");
  assert.ok(/LEDE_FIRST_RUN[\s\S]{0,120}rough notes/.test(SRC), "a newcomer gets first-run copy instead");
  assert.ok(/lede\.textContent = firstRun \?/.test(SRC), "the header lede follows the state");
});

test("the accordion CSS is deleted; the new list card recipe exists", () => {
  for (const cls of [".run-row__head", ".run-row__body", ".run-row__overview", ".run-row__actions"]) {
    assert.ok(!CSS.includes(cls), `${cls} deleted`);
  }
  assert.ok(CSS.includes(".run-list--card"), "one-card list surface");
  assert.ok(/\.run-list__item[^{]*\{[^}]*border-bottom/.test(CSS), "divider rows");
});
