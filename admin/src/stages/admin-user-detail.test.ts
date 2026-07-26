import { test } from "node:test";
import assert from "node:assert/strict";
import { identityHeader, runsSummary, runsTable, type UserProfile, type UserStats } from "./admin-user-detail.ts";

// The superadmin drilldown's D10 rework (design-consolidation Phase 6), re-laid out in the
// clarity pass (2026-07-26): the role pill joins the name row instead of floating on its own
// alignment axis, the three stat chips collapse to one quiet summary line beside the section
// title, and the 1:1s table sits on a white card. Pure string renders here; the recap header
// is a shared component with its own tests in ui/recap-header.test.ts.

const profile: UserProfile = {
  email: "ming@acme.co",
  role: "manager",
  company: "Acme",
  createdAt: "2024-11-18T09:00:00.000Z",
};
const stats: UserStats = { runCount: 4, peopleCount: 2, avgStars: 4.25 };

test("identityHeader leads with the avatar initial and the name, not the parent list", () => {
  const html = identityHeader("Ming", profile);
  assert.match(html, /class="ds-avatar rd-avatar"[^>]*>M</, "avatar carries the initial");
  assert.match(html, /<h1 class="rd-name">Ming<\/h1>/, "the h1 names the person");
  assert.ok(html.includes('aria-label="Breadcrumb"'), "one breadcrumb trail, no back button");
  assert.ok(html.includes('data-nav="users"'), "the trail steps back to User management");
});

test("identityHeader shows email, company, joined date (house format) and the role pill", () => {
  const html = identityHeader("Ming", profile);
  assert.ok(html.includes("ming@acme.co · Acme · joined Mon 18 Nov 2024"), "quiet detail line, middot-joined");
  assert.match(html, /um-badge--manager[^>]*>manager</, "role pill");
});

test("identityHeader keeps the role pill on the name's line (L3: three alignment axes)", () => {
  const html = identityHeader("Ming", profile);
  const row = /<div class="ud-nameline">([\s\S]*?)<\/div>\s*<div class="text-ink-dim/.exec(html);
  assert.ok(row, "the name row exists and the detail line follows it");
  assert.ok(row![1].includes("<h1"), "the name is in the row");
  assert.ok(row![1].includes("um-badge"), "the pill is in the same row, not pushed to the far right");
});

test("identityHeader degrades to name-only when the profile lookup failed", () => {
  const html = identityHeader("Ming", null);
  assert.match(html, /<h1 class="rd-name">Ming<\/h1>/, "name still leads");
  assert.ok(!html.includes("joined"), "no joined line without a profile");
  assert.ok(!html.includes("um-badge"), "no role pill without a profile");
});

test("runsSummary is one quiet line, not three near-empty chips", () => {
  const line = runsSummary(stats);
  assert.ok(line.includes("4 1:1s"), "1:1 count");
  assert.ok(line.includes("2 people"), "people count");
  assert.ok(line.includes("4.3 avg"), "stars average rounded to one decimal");
  assert.ok(!line.includes("chip"), "no chips left on this screen");
  assert.ok(!/\bmeetings?\b/i.test(line), "the word 'meeting' is gone from this screen");
});

test("runsSummary counts read naturally at one, and drop the rating when nothing is rated", () => {
  const one = runsSummary({ runCount: 1, peopleCount: 1, avgStars: 5 });
  assert.ok(one.includes("1 1:1 ") || one.includes("1 1:1<"), "singular 1:1");
  assert.ok(one.includes("1 person"), "singular person");
  assert.ok(!runsSummary({ runCount: 2, peopleCount: 1, avgStars: null }).includes("avg"), "no rating without ratings");
  assert.equal(runsSummary({ runCount: 0, peopleCount: 0, avgStars: null }), "", "nothing to summarise at zero");
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
  assert.ok(html.includes('class="um-table um-table--flush"'), "the one table style");
  assert.ok(html.includes("ud-chev"), "a chevron marks the row as openable");
  assert.match(html, /js-run-row[^>]*data-run-id="r-1"/, "row carries its run id");
  assert.ok(html.includes("UX Designer · Staff"), "role and seniority join with a middot, never a comma");
  assert.ok(html.includes("Bi-weekly check-in"), "the 1:1 keeps its named cadence");
  assert.match(html, /aria-label="rated 4 out of 5"/, "rating badge is labelled");
  assert.ok(html.includes("–"), "unrated shows the empty-value glyph");
  assert.ok(!/\bmeetings?\b/i.test(html), "no 'meeting' wording in the table");
});

test("runsTable sits on a white card with set column widths and a right-aligned rating", () => {
  const html = runsTable([]);
  assert.ok(html.includes("ud-panel"), "the table sits on its own card, not naked on the tinted page");
  assert.ok(html.includes("<colgroup>"), "columns are proportioned, not stretched by content");
  assert.ok(html.includes('class="ud-rate num-tabular"'), "rating column right-aligns with lining digits");
});
