import { test } from "node:test";
import assert from "node:assert/strict";
import { personCard, runSubtitle } from "./admin-user-detail.ts";

// The superadmin drilldown's label tidy (2026-07-21). The recap header itself is a shared
// component — its own tests live in ui/recap-header.test.ts. Pure string renders here.

const ctx = { name: "Ming", role: "UX Designer", seniority: "Staff", meetingType: "Bi-weekly check-in" };

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
