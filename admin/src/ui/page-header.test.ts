import { test } from "node:test";
import assert from "node:assert/strict";
import { pageHeader } from "./page-header.ts";

// The one page-header contract (design-consolidation Phase 0): eyebrow = nav group,
// h1 = page name, optional lede, actions right, optional breadcrumb above.
// Pure string render on the existing .page-header primitive classes.

test("renders eyebrow, title and lede in the shared primitive classes", () => {
  const html = pageHeader({ eyebrow: "Work", title: "Team", lede: "The people you meet." });
  assert.ok(html.includes('class="page-header"'), "primitive wrapper");
  assert.match(html, /page-header__step[^>]*>Work</, "eyebrow in the step slot");
  assert.match(html, /<h1 class="h1">Team<\/h1>/, "h1 title");
  assert.match(html, /page-header__lede[^>]*>The people you meet\.</, "lede");
});

test("actions sit in the header row, right of the title", () => {
  const html = pageHeader({ title: "Team", actionsHtml: '<button class="btn">Add person</button>' });
  assert.ok(html.includes('class="page-header__row"'), "row wrapper present with actions");
  const row = html.indexOf("page-header__row");
  const h1 = html.indexOf("<h1");
  const btn = html.indexOf("Add person");
  assert.ok(row < h1 && h1 < btn, "title first, actions after, inside the row");
});

test("without actions there is no empty row wrapper", () => {
  const html = pageHeader({ title: "Team" });
  assert.ok(!html.includes("page-header__row"), "no row when no actions");
});

test("a breadcrumb renders above the header when crumbs are given", () => {
  const html = pageHeader({ title: "Maya", crumbs: [{ label: "Team", nav: "team" }, { label: "Maya" }] });
  assert.ok(html.includes('aria-label="Breadcrumb"'), "breadcrumb landmark present");
  assert.ok(html.indexOf("Breadcrumb") < html.indexOf("<h1"), "crumbs sit above the title");
});

test("escapes eyebrow, title and lede; actionsHtml is trusted markup and passed through", () => {
  const html = pageHeader({ eyebrow: "<i>e</i>", title: "<b>t</b>", lede: "<u>l</u>", actionsHtml: "<button>ok</button>" });
  assert.ok(!html.includes("<b>t</b>") && html.includes("&lt;b&gt;t&lt;/b&gt;"), "title escaped");
  assert.ok(!html.includes("<i>e</i>"), "eyebrow escaped");
  assert.ok(!html.includes("<u>l</u>"), "lede escaped");
  assert.ok(html.includes("<button>ok</button>"), "actions markup passed through");
});
