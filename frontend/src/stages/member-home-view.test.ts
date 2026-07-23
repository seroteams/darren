import { test } from "node:test";
import assert from "node:assert/strict";
import {
  renderRunsSection,
  renderRequestsCard,
  renderGoalsCard,
  type MemberRun,
  type MemberRequest,
  type MemberGoal,
} from "./member-home-view.ts";
import { formatDate } from "../../../admin/src/ui/time.ts";

// Member Home, recomposed (design-consolidation Phase 2, audit A5): a top card for the
// most recent 1:1 about the member, a timeline of the earlier ones, a privacy caption,
// and Requests + Goals as system-styled cards. Pure string renders — no DOM, no network.
// The parallel mh-* widget kit is gone: inputs are the compact boxed recipe
// (.apm-field__input), buttons are .btn / .btn--ghost, statuses are the standard chips.

const runs: MemberRun[] = [
  { meetingType: "Bi-weekly check-in", completedAt: 1752000000000, lastSeenAt: 1752000000000, managerName: "Maria" },
  { meetingType: "Monthly check-in", completedAt: 1749000000000, lastSeenAt: 1749000000000, managerName: "Maria" },
];

test("the most recent 1:1 gets the top card: type, date, manager", () => {
  const html = renderRunsSection(runs);
  assert.ok(html.includes("Your latest 1:1"), "top card labelled");
  assert.ok(html.includes("Bi-weekly check-in"), "1:1 type shown");
  assert.ok(html.includes(formatDate(1752000000000)), "formatted date shown");
  assert.ok(html.includes("with Maria"), "manager named");
});

test("earlier 1:1s go in the timeline; the latest is not repeated there", () => {
  const html = renderRunsSection(runs);
  assert.ok(html.includes("Earlier 1:1s"), "timeline section named");
  assert.equal((html.match(/member-runs__entry/g) ?? []).length, 1, "one timeline entry for the one earlier run");
  assert.ok(html.includes("Monthly check-in"), "earlier 1:1 in the timeline");
});

test("the privacy caption sits under the timeline whenever there is history", () => {
  assert.ok(renderRunsSection(runs).includes("Only the date and 1:1 type are recorded here."));
  assert.ok(renderRunsSection([runs[0]]).includes("Only the date and 1:1 type are recorded here."), "caption stays with a single run");
});

test("a single 1:1 renders the top card without an empty timeline section", () => {
  const html = renderRunsSection([runs[0]]);
  assert.ok(!html.includes("Earlier 1:1s"), "no earlier section");
  assert.ok(!html.includes("member-runs__timeline"), "no empty list");
});

test("no 1:1s yet: the designed empty state (icon + headline + reassurance), no caption", () => {
  const html = renderRunsSection([]);
  assert.ok(html.includes("member-empty"), "empty-state block");
  assert.ok(html.includes("sero-icon"), "Lucide icon rendered through the shared helper");
  assert.ok(html.includes("No 1:1s yet"), "one-line headline");
  assert.ok(html.includes("When your manager preps a 1:1 with you, it shows up here"), "reassurance copy kept");
  assert.ok(!html.includes("member-runs__timeline"), "no dead timeline");
});

test("run fields are escaped", () => {
  const html = renderRunsSection([{ meetingType: "<b>x</b>", completedAt: 1752000000000, lastSeenAt: null, managerName: "<i>m</i>" }]);
  assert.ok(!html.includes("<b>x</b>"), "type escaped");
  assert.ok(!html.includes("<i>m</i>"), "manager escaped");
});

const requests: MemberRequest[] = [
  { id: "r1", text: "More pairing time", status: "new" },
  { id: "r2", text: "Conference budget", status: "in_progress" },
  { id: "r3", text: "New laptop", status: "resolved" },
];

test("request statuses are the standard chip recipe, not dim text", () => {
  const html = renderRequestsCard(requests);
  assert.ok(html.includes('class="chip chip--accent chip--dot">New<'), "new → accent chip");
  assert.ok(html.includes('class="chip chip--gold chip--dot">In progress<'), "in progress → gold chip");
  assert.ok(html.includes('class="chip chip--mint chip--dot">Resolved<'), "resolved → mint chip");
});

test("the add-request form wears the system input recipe and the one solid accent", () => {
  const html = renderRequestsCard(requests);
  assert.ok(!/\bmh-/.test(html), "mh-* kit gone");
  assert.equal((html.match(/apm-field__input/g) ?? []).length, 2, "text input + category select on the compact boxed recipe");
  assert.ok(html.includes('class="btn">Add request</button>'), "Add request is the screen's one accent");
});

test("no requests yet keeps a quiet line and the form", () => {
  const html = renderRequestsCard([]);
  assert.ok(html.includes("No requests yet."));
  assert.ok(html.includes("js-add-req"), "form still there");
});

test("request text is escaped", () => {
  const html = renderRequestsCard([{ id: "r9", text: "<script>x</script>", status: "new" }]);
  assert.ok(!html.includes("<script>x</script>"));
});

const goals: MemberGoal[] = [
  { id: "g1", text: "Ship the design system", progress: 40 },
  { id: "g2", text: "Mentor a junior", progress: 0 },
];

test("goal progress is a bar in the axis language with the number beside it", () => {
  const html = renderGoalsCard(goals);
  assert.ok(html.includes("member-goal__bar"), "track rendered");
  assert.ok(html.includes('style="width: 40%"'), "fill scales with progress");
  assert.ok(html.includes(">40%<"), "number beside the bar");
  assert.ok(html.includes('aria-valuenow="40"'), "meter exposed to assistive tech");
});

test("goal editing keeps the numeric input, the note, and a ghost Save", () => {
  const html = renderGoalsCard(goals);
  assert.ok(html.includes('type="number"') && html.includes('value="40"'), "numeric input pre-filled");
  assert.ok(html.includes("Add an update…"), "note input kept");
  assert.ok(html.includes('class="btn btn--ghost js-goal-save">Save<'), "Save is a ghost, not a second accent");
});

test("goal progress is clamped to 0-100 for the bar", () => {
  const over = renderGoalsCard([{ id: "g3", text: "x", progress: 150 }]);
  assert.ok(over.includes('style="width: 100%"'), "over-100 clamps");
  const junk = renderGoalsCard([{ id: "g4", text: "y", progress: null }]);
  assert.ok(junk.includes('style="width: 0%"'), "missing progress reads as 0");
});

test("no goals yet: the designed empty state with the existing reassurance copy", () => {
  const html = renderGoalsCard([]);
  assert.ok(html.includes("member-empty"), "empty-state block");
  assert.ok(html.includes("sero-icon"), "Lucide icon");
  assert.ok(html.includes("No goals yet"), "one-line headline");
  assert.ok(html.includes("Your manager sets these with you in your 1:1."), "reassurance copy kept");
});

test("one accent per screen: across both cards there is exactly one solid .btn", () => {
  const html = renderRequestsCard(requests) + renderGoalsCard(goals);
  assert.equal((html.match(/class="btn"/g) ?? []).length, 1, "Add request is the only solid button");
  assert.ok(!/\bmh-/.test(html), "no mh-* classes anywhere");
});
