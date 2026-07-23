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
  assert.ok(/meetingType[\s\S]{0,80}formatRelativeTime/.test(SRC), "second line = meeting type + relative time");
  assert.ok(/\.run-list__name\s*\{[^}]*semibold/.test(CSS), "name reads bold");
  assert.ok(/\.run-list__sub\s*\{[^}]*ink-dim/.test(CSS), "second line reads quiet");
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

test("empty, loading and failed-resume states survive the new layout", () => {
  assert.ok(SRC.includes("firstRunIntroHtml"), "zero-run welcome card kept");
  assert.ok(SRC.includes("createSkeleton"), "loading skeleton kept");
  assert.ok(SRC.includes("staleRunRecoveryHtml"), "failed resume heals in place");
});

test("the accordion CSS is deleted; the new list card recipe exists", () => {
  for (const cls of [".run-row__head", ".run-row__body", ".run-row__overview", ".run-row__actions"]) {
    assert.ok(!CSS.includes(cls), `${cls} deleted`);
  }
  assert.ok(CSS.includes(".run-list--card"), "one-card list surface");
  assert.ok(/\.run-list__item[^{]*\{[^}]*border-bottom/.test(CSS), "divider rows");
});
