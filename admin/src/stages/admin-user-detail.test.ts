import { test } from "node:test";
import assert from "node:assert/strict";
import { recapHeader, personCard, runSubtitle } from "./admin-user-detail.ts";

// The superadmin drilldown's IA polish (2026-07-21). Pure string renders, so we assert on
// the markup directly — the DOM wiring (breadcrumb clicks) isn't covered here.

const ctx = { name: "Ming", role: "UX Designer", seniority: "Staff", meetingType: "Bi-weekly check-in" };

test("the recap header names the 1:1 you're reading — not the manager", () => {
  const html = recapHeader(ctx, "Eric");
  // The heading is the person whose 1:1 this is…
  assert.ok(html.includes('<h1 class="rd-name">Ming</h1>'), "person is the heading");
  // …never the manager re-shown as the big page title (the old bug).
  assert.ok(!/<h1 class="h1">/.test(html), "no manager <h1 class='h1'> stacked on the recap");
  assert.ok(!html.includes("Their people and 1:1s"), "the user page-subtitle no longer rides along");
});

test("the recap header carries ONE breadcrumb trail, meeting as the current page", () => {
  const html = recapHeader(ctx, "Eric");
  assert.ok(html.includes('aria-label="Breadcrumb"'), "a single breadcrumb landmark");
  assert.ok(html.includes('js-crumb" data-nav="users">User management<'), "crumb back to the list");
  assert.ok(html.includes('data-nav="list">Eric<'), "crumb back to the manager");
  assert.match(html, /crumb--current"[^>]*aria-current="page">Bi-weekly check-in</, "meeting is the current crumb");
  // The old bespoke back buttons are gone.
  assert.ok(!html.includes("‹ User management") && !html.includes("Back to"), "no stacked back buttons");
});

test("the recap header shows role · seniority (middot) and the meeting badge", () => {
  const html = recapHeader(ctx, "Eric");
  assert.ok(html.includes(">UX Designer · Staff<"), "middot-joined role · seniority");
  assert.ok(!html.includes("UX Designer, Staff"), "not the old comma form");
  assert.ok(html.includes('rd-type-badge">Bi-weekly check-in<'), "meeting-type badge");
});

test("the recap header degrades gracefully with an empty context", () => {
  const html = recapHeader({ name: "", role: "", seniority: "", meetingType: "" }, "Eric");
  assert.ok(html.includes('<h1 class="rd-name">This 1:1</h1>'), "fallback heading");
  assert.match(html, /aria-current="page">1:1</, "meeting crumb falls back to 1:1");
  assert.ok(!html.includes("rd-type-badge"), "no badge without a meeting type");
});

test("personCard calls a 1:1 a '1:1', consistently — never 'meeting'", () => {
  const base = { key: "k", name: "Ming", role: "UX Designer", lastMet: 1752000000000, ratedCount: 0, avgStars: null };
  const many = personCard({ ...base, count: 4 });
  assert.ok(many.includes("4 1:1s"), "plural 1:1s");
  assert.ok(personCard({ ...base, count: 1 }).includes("1 1:1"), "singular 1:1");
  assert.ok(!/\bmeetings?\b/.test(many), "the word 'meeting' is gone from this screen");
});

test("runSubtitle joins role and seniority with a middot, matching the member recap", () => {
  assert.equal(runSubtitle(ctx), "Ming · UX Designer · Staff · Bi-weekly check-in");
  assert.ok(!runSubtitle(ctx).includes(","), "no comma joiner anywhere");
});
