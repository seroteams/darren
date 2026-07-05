#!/usr/bin/env node
// Person profiles are derived, never drifting: the same run data must render
// the same bytes, not-read axes show as "n.r." (never a fake zero), and the
// "How to help them" section stays an honest stub until synthesis exists.

const assert = require("node:assert/strict");
const { slugify, renderProfileMarkdown } = require("../backend/engine/person-profile.ts");

// 1. slugify: group key is forgiving but never empty.
{
  assert.equal(slugify("Maya"), "maya");
  assert.equal(slugify("Maya Chen"), "maya-chen");
  assert.equal(slugify("  Maya  "), "maya");
  assert.equal(slugify("O'Brien, Sam"), "o-brien-sam");
  assert.equal(slugify(""), null, "empty name produces no slug");
  assert.equal(slugify("!!!"), null, "all-symbols name produces no slug");
  assert.equal(slugify(undefined), null);
}

function axis(id, score, read) {
  return { id, score, read, confidence: read ? "medium" : null };
}

function run(id, completedAt, axes, overrides = {}) {
  return {
    id,
    completedAt,
    ctx: { name: "Maya", role: "Product designer", seniority: "Senior", meetingType: "Weekly 1:1" },
    mode: "manual",
    runLabel: null,
    axes,
    summaryBullets: [],
    nextActions: [],
    watchFor: [],
    engagementReadStatus: "not_read",
    review: { reviewStatus: "none", overall: null, failedCount: 0, decided: 0 },
    ...overrides,
  };
}

const fullAxes = (w, e, c, g) => [
  axis("wellbeing", w, w !== null),
  axis("engagement", e, e !== null),
  axis("clarity", c, c !== null),
  axis("growth", g, g !== null),
];

// Newest first, as collectPersonRuns returns them.
const twoRuns = {
  slug: "maya",
  name: "Maya",
  runs: [
    run("run-b", Date.UTC(2026, 5, 8, 12), fullAxes(3, null, 4, null)),
    run("run-a", Date.UTC(2026, 5, 1, 12), fullAxes(2, -1, null, null)),
  ],
};

// 2. Deterministic render: same input twice -> identical bytes.
{
  const first = renderProfileMarkdown(twoRuns);
  const second = renderProfileMarkdown(twoRuns);
  assert.equal(first, second, "render must be byte-identical for the same input");
}

// 3. Not-read axes show as "n.r." and trends count only read sessions.
{
  const md = renderProfileMarkdown(twoRuns);
  assert.match(md, /n\.r\./, "not-read axes render as n.r.");
  assert.match(md, /Wellbeing: 2 → 3 {2}\(read in 2 of 2 runs\)/, "trend is oldest -> newest");
  assert.match(md, /Engagement: -1 {2}\(read in 1 of 2 runs\)/, "partial reads counted honestly");
  assert.match(md, /Growth: not read in any run yet/, "never-read axis says so");
  assert.match(md, /run-b/, "run table lists run ids");
}

// 4. No synthesis yet: the help section is an honest stub, not a guess.
{
  const md = renderProfileMarkdown(twoRuns, null);
  assert.match(md, /## How to help them\nNot enough yet — this section is written from run evidence in a later phase\./);
}

// 5. Fewer than 2 runs: the stub says exactly why.
{
  const oneRun = { slug: "maya", name: "Maya", runs: [twoRuns.runs[0]] };
  const md = renderProfileMarkdown(oneRun, null);
  assert.match(md, /only 1 finished run/, "single-run people get the not-enough-history stub");
}

// 6. With synthesis, every bullet renders with its run ids; empty sections are honest.
{
  const synthesis = {
    open_threads: [{ text: "Promotion criteria still undefined.", run_ids: ["run-a", "run-b"] }],
    whats_landed: [],
    watch_for: [{ text: "Crit energy after the reorg.", run_ids: ["run-b"] }],
    data_limits: "Growth has never been read.",
  };
  const md = renderProfileMarkdown(twoRuns, synthesis);
  assert.match(md, /Promotion criteria still undefined\. \[run-a, run-b\]/, "bullets carry citations");
  assert.match(md, /### What's landed\nNothing established yet\./, "empty section is explicit");
  assert.match(md, /### Data limits\nGrowth has never been read\./);
}

console.log("person-profile: all assertions passed");
