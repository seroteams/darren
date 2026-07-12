import { test } from "node:test";
import assert from "node:assert/strict";
import { renderRunDetail, type RunDetail } from "./run-detail.ts";
import { formatDate } from "../ui/time.ts";

// The Past 1:1 detail body: three tabs (Overview / Briefing / Answers), a profile
// header, a "when it happened" row, and the raw Q&A. Pure string render, so we assert
// on the markup directly — no DOM, no network.

const run: RunDetail = {
  id: "r1",
  headline: "Priya · Product Designer · Senior · Bi-weekly check-in",
  ctx: { name: "Priya", role: "Product Designer", seniority: "Senior", meetingType: "Bi-weekly check-in" },
  briefing: {
    headline: "Stretched across two launches",
    summary_bullets: ["Carrying two launches at once."],
    understanding_paragraph: "Engaged but near her limit.",
  },
  turns: [
    { alias: "q_workload", name: "How is the workload?", answer: "Stretched thin", skipped: false },
    { alias: "q_home", name: "Anything at home?", answer: "(skipped)", skipped: true },
  ],
  lastSeenAt: 1752000000000,
  completedAt: 1752000000000,
  rating: null,
};

test("renders the three tabs, Overview active first", () => {
  const html = renderRunDetail(run);
  assert.ok(html.includes(">Overview</button>"), "Overview tab");
  assert.ok(html.includes(">Briefing</button>"), "Briefing tab");
  assert.ok(html.includes(">Answers</button>"), "Answers tab");
  assert.ok(html.includes('class="ds-tab is-active" role="tab" aria-selected="true" data-tab="overview"'), "Overview starts active");
  assert.ok(html.includes('data-pane="briefing" hidden') && html.includes('data-pane="answers" hidden'), "non-active panes start hidden");
});

test("Overview shows the profile, meeting type, when-row and the one-line read", () => {
  const html = renderRunDetail(run);
  assert.ok(html.includes(">Priya<"), "name");
  assert.ok(html.includes("Product Designer · Senior"), "role · seniority");
  assert.ok(html.includes(">Bi-weekly check-in<"), "meeting-type badge");
  assert.ok(html.includes(formatDate(run.completedAt!)), "formatted completed date");
  assert.ok(html.includes("1 question answered"), "count excludes the skipped turn");
  assert.ok(html.includes("Stretched across two launches"), "briefing headline as the digest");
  assert.ok(html.includes("Did this help you run the 1:1?"), "rating card on Overview");
});

test("Briefing tab reuses the shared briefing cards", () => {
  assert.ok(renderRunDetail(run).includes("What stood out"), "briefing section rendered");
});

test("Answers tab lists each question with its answer; skipped turns are marked", () => {
  const html = renderRunDetail(run);
  assert.ok(html.includes("How is the workload?"), "question shown");
  assert.ok(html.includes("Stretched thin"), "answer shown");
  assert.ok(html.includes("Anything at home?"), "skipped question still shown");
  assert.ok(html.includes("<em>Skipped</em>"), "skipped turn marked");
});

test("Answers tab shows an empty state when nothing was captured", () => {
  const html = renderRunDetail({ ...run, turns: [] });
  assert.ok(html.includes("No answers were captured in this session."), "empty state");
  assert.ok(html.includes("0 questions answered"), "count is zero, plural");
});

test("count says '1 question' singular, 'N questions' plural", () => {
  assert.ok(renderRunDetail(run).includes("1 question answered"));
  const two: RunDetail = {
    ...run,
    turns: [
      { alias: "a", name: "Q1", answer: "x", skipped: false },
      { alias: "b", name: "Q2", answer: "y", skipped: false },
    ],
  };
  assert.ok(renderRunDetail(two).includes("2 questions answered"));
});
