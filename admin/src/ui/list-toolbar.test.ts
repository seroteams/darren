import { test } from "node:test";
import assert from "node:assert/strict";
import { listToolbar } from "./list-toolbar.ts";

// The shared list toolbar (design-consolidation Phase 0) — pure string render like
// breadcrumb.ts: hosts wire the js- hooks. One toolbar recipe for every list screen.

test("renders a search input with the given placeholder and hook class", () => {
  const html = listToolbar({ search: { placeholder: "Search the team" } });
  assert.ok(html.includes('class="list-toolbar"'), "toolbar wrapper");
  assert.match(html, /<input[^>]*class="[^"]*js-lt-search[^"]*"/, "search input carries the js hook");
  assert.ok(html.includes('placeholder="Search the team"'), "placeholder text");
  assert.match(html, /type="search"/, "a real search input");
});

test("renders the count with singular and plural nouns", () => {
  const one = listToolbar({ count: { n: 1, noun: "person", nounPlural: "people" } });
  assert.ok(one.includes(">1 person<"), "singular at 1");
  const eight = listToolbar({ count: { n: 8, noun: "person", nounPlural: "people" } });
  assert.ok(eight.includes(">8 people<"), "plural otherwise");
  const runs = listToolbar({ count: { n: 3, noun: "run" } });
  assert.ok(runs.includes(">3 runs<"), "default plural adds s");
});

test("renders filter chips as pressable buttons with their keys, active state marked", () => {
  const html = listToolbar({
    filters: [
      { key: "all", label: "All", active: true },
      { key: "external", label: "External" },
    ],
  });
  assert.match(html, /js-lt-filter[^>]*data-key="all"[^>]*aria-pressed="true"/, "active chip pressed");
  assert.match(html, /js-lt-filter[^>]*data-key="external"[^>]*aria-pressed="false"/, "inactive chip unpressed");
  assert.ok(html.includes(">All<") && html.includes(">External<"), "labels rendered");
});

test("omits sections that were not asked for", () => {
  const html = listToolbar({ count: { n: 2, noun: "run" } });
  assert.ok(!html.includes("js-lt-search"), "no search when not requested");
  assert.ok(!html.includes("js-lt-filter"), "no filters when not requested");
});

test("escapes user-provided text everywhere", () => {
  const html = listToolbar({
    search: { placeholder: '"><script>' },
    count: { n: 2, noun: "<b>x</b>" },
    filters: [{ key: '">k', label: "<i>f</i>" }],
  });
  assert.ok(!html.includes("<script>"), "placeholder escaped");
  assert.ok(!html.includes("<b>x</b>"), "noun escaped");
  assert.ok(!html.includes("<i>f</i>"), "filter label escaped");
  assert.ok(!html.includes('data-key="">k"'), "filter key escaped");
});
