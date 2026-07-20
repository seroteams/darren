import { test } from "node:test";
import assert from "node:assert/strict";
import { breadcrumb } from "./breadcrumb.ts";

// The admin drill-down breadcrumb trail — a pure string render, so we assert on the
// markup directly (no DOM). Non-current crumbs are buttons carrying a data-nav key the
// host stage wires; the current page is plain text.

test("wraps the crumbs in a labelled nav and shows every label", () => {
  const html = breadcrumb([{ label: "User management", nav: "users" }, { label: "Eric" }]);
  assert.ok(html.includes('<nav class="crumbs" aria-label="Breadcrumb">'), "labelled nav landmark");
  assert.ok(html.includes(">User management<"), "first label");
  assert.ok(html.includes(">Eric<"), "second label");
});

test("non-current crumbs are buttons with their nav key; the last is plain current text", () => {
  const html = breadcrumb([
    { label: "User management", nav: "users" },
    { label: "Eric", nav: "list" },
    { label: "Bi-weekly check-in" },
  ]);
  assert.ok(html.includes('class="crumb crumb--link js-crumb" data-nav="users"'), "first crumb is a nav button");
  assert.ok(html.includes('data-nav="list"'), "middle crumb carries its own nav key");
  assert.match(html, /crumb--current"[^>]*aria-current="page">Bi-weekly check-in</, "current page marked");
  assert.ok(!/js-crumb[^>]*>Bi-weekly check-in</.test(html), "the current page is not a button");
});

test("a crumb without a nav key is never a button, even mid-trail", () => {
  const html = breadcrumb([{ label: "User management" }, { label: "Eric" }]);
  assert.ok(!html.includes("js-crumb"), "no navigable buttons when no nav keys given");
});

test("separators sit between crumbs, not at the ends", () => {
  const one = breadcrumb([{ label: "A" }]);
  assert.ok(!one.includes("crumb__sep"), "a single crumb has no separator");
  const three = breadcrumb([{ label: "A", nav: "a" }, { label: "B", nav: "b" }, { label: "C" }]);
  assert.equal((three.match(/crumb__sep/g) || []).length, 2, "N crumbs → N-1 separators");
});

test("escapes crumb labels and nav keys", () => {
  const html = breadcrumb([{ label: "<b>x</b>", nav: '"><script>' }, { label: "y" }]);
  assert.ok(!html.includes("<b>x</b>"), "label is HTML-escaped");
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.ok(!html.includes('"><script>'), "nav key is escaped in the attribute");
});
