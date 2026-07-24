import { test } from "node:test";
import assert from "node:assert/strict";
import { identityHeader, runsTable, type UserProfile, type UserStats } from "./admin-user-detail.ts";

// The superadmin drilldown's D10 rework (design-consolidation Phase 6): identity header +
// the 1:1s as a um-table. Pure string renders here; the recap header is a shared component
// with its own tests in ui/recap-header.test.ts.

const profile: UserProfile = {
  email: "ming@acme.co",
  role: "manager",
  company: "Acme",
  createdAt: "2024-11-18T09:00:00.000Z",
};
const stats: UserStats = { runCount: 4, peopleCount: 2, avgStars: 4.25 };

test("identityHeader leads with the avatar initial and the name, not the parent list", () => {
  const html = identityHeader("Ming", profile, stats);
  assert.match(html, /class="ds-avatar rd-avatar"[^>]*>M</, "avatar carries the initial");
  assert.match(html, /<h1 class="rd-name">Ming<\/h1>/, "the h1 names the person");
  assert.ok(html.includes('aria-label="Breadcrumb"'), "one breadcrumb trail, no back button");
  assert.ok(html.includes('data-nav="users"'), "the trail steps back to User management");
});

test("identityHeader shows email, company, joined date (house format) and the role pill", () => {
  const html = identityHeader("Ming", profile, stats);
  assert.ok(html.includes("ming@acme.co · Acme · joined Mon 18 Nov 2024"), "quiet detail line, middot-joined");
  assert.match(html, /um-badge--manager[^>]*>manager</, "role pill");
});

test("identityHeader stat chips: 1:1 count, people, stars avg. Never the word 'meeting'", () => {
  const html = identityHeader("Ming", profile, stats);
  assert.ok(html.includes("4 1:1s"), "plural 1:1s chip");
  assert.ok(html.includes("2 people"), "people chip");
  assert.ok(html.includes("4.3 avg"), "stars average rounded to one decimal");
  assert.ok(!/\bmeetings?\b/i.test(html), "the word 'meeting' is gone from this screen");
  assert.ok(identityHeader("Ming", profile, { ...stats, runCount: 1 }).includes("1 1:1"), "singular 1:1");
});

test("identityHeader degrades to name-only when the profile lookup failed", () => {
  const html = identityHeader("Ming", null, { runCount: 0, peopleCount: 0, avgStars: null });
  assert.match(html, /<h1 class="rd-name">Ming<\/h1>/, "name still leads");
  assert.ok(!html.includes("joined"), "no joined line without a profile");
  assert.ok(!html.includes("um-badge"), "no role pill without a profile");
  assert.ok(!html.includes("avg"), "no stars chip when nothing is rated");
});

test("runsTable renders the house um-table with clickable rows carrying the run id", () => {
  const runs = [
    {
      id: "r-1",
      headline: "Workload check",
      ctx: { name: "Priya", role: "UX Designer", seniority: "Staff", meetingType: "Bi-weekly check-in" },
      lastSeenAt: Date.now() - 60_000,
      rating: { stars: 4 },
    },
    {
      id: "r-2",
      headline: "First chat",
      ctx: { name: "Sam", role: "", seniority: "", meetingType: "" },
      lastSeenAt: Date.now() - 120_000,
      rating: null,
    },
  ];
  const html = runsTable(runs);
  assert.ok(html.includes('class="um-table"'), "the one table style");
  assert.match(html, /js-run-row[^>]*data-run-id="r-1"/, "row carries its run id");
  assert.ok(html.includes("UX Designer · Staff"), "role and seniority join with a middot, never a comma");
  assert.ok(html.includes("Bi-weekly check-in"), "the 1:1 keeps its named cadence");
  assert.match(html, /aria-label="rated 4 out of 5"/, "rating badge is labelled");
  assert.ok(html.includes("–"), "unrated shows the empty-value glyph");
  assert.ok(!/\bmeetings?\b/i.test(html), "no 'meeting' wording in the table");
});
