import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// runs.ts imports CSS, so node can't import it directly — this guard reads the
// source instead (same approach as briefing-structure.test.ts). It locks the
// design-consolidation Phase 1 shape for Past 1:1s (audit M6): canonical rich
// rows, shared toolbar with client-side name search, recency grouping, and the
// Start 1:1 accent in the page header. The member view stays untouched.
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, "runs.ts"), "utf8");

test("manager rows use the canonical anatomy: avatar, bold name, quiet type-and-date line", () => {
  assert.ok(SRC.includes("ds-avatar"), "shared avatar circle");
  assert.ok(SRC.includes("run-list__name"), "bold person name slot");
  assert.ok(SRC.includes("run-list__sub"), "quiet second line slot");
  assert.ok(/meetingType[\s\S]{0,80}whenLabel/.test(SRC), "second line = meeting type + relative date");
});

test("the star rating badge renders on the right only when a rating exists", () => {
  const row = SRC.slice(SRC.indexOf("function managerRow"));
  assert.ok(/r\.rating\s*\?/.test(row), "badge is conditional on the rating");
  assert.ok(row.includes("runs-list__stars"), "the existing star badge class");
  assert.ok(row.includes("run-list__side"), "badge sits in the row's right slot");
});

test("rows sit in one card as divider rows, whole row clickable, routing kept", () => {
  assert.ok(SRC.includes("run-list--card"), "one-card list surface");
  assert.ok(SRC.includes("run-list__item"), "divider rows");
  assert.ok(SRC.includes("js-open"), "whole row opens the run");
  assert.ok(/data-kind[\s\S]*guided[\s\S]*STAGES\.GUIDED/.test(SRC), "guided rows keep their route");
  assert.ok(SRC.includes("STAGES.RUN_DETAIL"), "interview rows keep their route");
});

test("the shared toolbar searches by person name and shows the 1:1 count", () => {
  assert.ok(SRC.includes("listToolbar("), "shared toolbar contract");
  assert.ok(SRC.includes("js-lt-search"), "search hook wired");
  assert.ok(/count:\s*\{[^}]*noun:\s*"1:1"/.test(SRC), "count reads N 1:1s");
  assert.ok(SRC.includes("data-name"), "rows carry the name for client-side filtering");
});

test("runs group by recency", () => {
  for (const label of ["This week", "This month", "Earlier"]) {
    assert.ok(SRC.includes(label), `group label: ${label}`);
  }
  assert.ok(SRC.includes("run-list__grouphead"), "group heads render in the list");
});

test("Start 1:1 moved into the page header; the floating bar is gone", () => {
  assert.ok(SRC.includes("pageHeader("), "shared header contract");
  assert.ok(/actionsHtml[\s\S]{0,120}js-start/.test(SRC), "the accent action sits in the header");
  assert.ok(!SRC.includes("runs-list__actions"), "floating right-aligned bar deleted");
  const accents = SRC.match(/class="btn js-start"/g) || [];
  assert.equal(accents.length, 1, "exactly one solid Start 1:1 accent");
});

test("the member view is intact: list-only, unclickable, its own title and lede", () => {
  assert.ok(SRC.includes("Your 1:1s"), "member title kept");
  assert.ok(SRC.includes("Dates and 1:1 types, nothing else."), "member lede kept");
  assert.ok(SRC.includes("getRunsAboutMe"), "member data stays the about-me endpoint");
  const about = SRC.slice(SRC.indexOf("function aboutEntry"), SRC.indexOf("function initialOf"));
  assert.ok(!about.includes("js-open"), "member rows stay unclickable");
  assert.ok(SRC.includes("member-runs__timeline"), "member timeline rendering kept");
});

test("empty, loading and error states survive the new layout", () => {
  assert.ok(SRC.includes("No 1:1s yet"), "empty state kept");
  assert.ok(SRC.includes("Loading your 1:1s"), "loading state kept");
  assert.ok(SRC.includes("js-retry"), "error state keeps its retry");
});

test("layout: medium container, no em dashes in user copy", () => {
  assert.ok(SRC.includes("stage-medium"), "medium width container");
  assert.ok(!SRC.includes("stage-inner"), "old narrow container gone");
  const copy = SRC.match(/`[^`]*`/g)?.join("") || "";
  assert.ok(!copy.includes("\u2014"), "no em dash in template copy");
});
