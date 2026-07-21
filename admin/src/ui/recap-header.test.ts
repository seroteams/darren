import { test } from "node:test";
import assert from "node:assert/strict";
import { recapHeader, roleLine } from "./recap-header.ts";

// The shared read-only recap header — a breadcrumb trail plus a profile that names the 1:1.
// Used by the user drilldown and the guest pile so neither re-shows its parent list's header
// above the recap. Pure string render, asserted directly.

const ctx = { name: "Ming", role: "UX Designer", seniority: "Staff", meetingType: "Bi-weekly check-in" };
const userTrail = [
  { label: "User management", nav: "users" },
  { label: "Eric", nav: "list" },
];

test("names the 1:1 you're reading: the person is the heading, not the parent", () => {
  const html = recapHeader(ctx, userTrail);
  assert.ok(html.includes('<h1 class="rd-name">Ming</h1>'), "person is the heading");
  assert.ok(!/<h1 class="h1">/.test(html), "no parent list <h1 class='h1'> stacked on the recap");
});

test("carries ONE breadcrumb trail with the meeting as the current page", () => {
  const html = recapHeader(ctx, userTrail);
  assert.ok(html.includes('aria-label="Breadcrumb"'), "a single breadcrumb landmark");
  assert.ok(html.includes('js-crumb" data-nav="users">User management<'), "crumb back to the list");
  assert.ok(html.includes('data-nav="list">Eric<'), "crumb back to the parent");
  assert.match(html, /crumb--current"[^>]*aria-current="page">Bi-weekly check-in</, "meeting is the current crumb");
  assert.ok(!html.includes("‹ ") && !html.includes("Back to"), "no bespoke back buttons");
});

test("shows role · seniority (middot) and the meeting badge", () => {
  const html = recapHeader(ctx, userTrail);
  assert.ok(html.includes(">UX Designer · Staff<"), "middot-joined role · seniority");
  assert.ok(!html.includes("UX Designer, Staff"), "not the old comma form");
  assert.ok(html.includes('rd-type-badge">Bi-weekly check-in<'), "meeting-type badge");
});

test("works with a single-crumb trail (the guest pile)", () => {
  const html = recapHeader(ctx, [{ label: "Guest runs", nav: "list" }]);
  assert.ok(html.includes('js-crumb" data-nav="list">Guest runs<'), "single parent crumb");
  assert.match(html, /aria-current="page">Bi-weekly check-in</, "meeting still the current crumb");
});

test("degrades gracefully with an empty context", () => {
  const html = recapHeader({ name: "", role: "", seniority: "", meetingType: "" }, [{ label: "Guest runs", nav: "list" }]);
  assert.ok(html.includes('<h1 class="rd-name">This 1:1</h1>'), "fallback heading");
  assert.match(html, /aria-current="page">1:1</, "meeting crumb falls back to 1:1");
  assert.ok(!html.includes("rd-type-badge"), "no badge without a meeting type");
});

test("roleLine is middot-joined and tolerant of missing pieces", () => {
  assert.equal(roleLine(ctx), "UX Designer · Staff");
  assert.equal(roleLine({ name: "", role: "UX Designer", seniority: "", meetingType: "" }), "UX Designer");
  assert.equal(roleLine({ name: "", role: "", seniority: "Staff", meetingType: "" }), "Staff");
});
