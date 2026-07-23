import { test } from "node:test";
import assert from "node:assert/strict";
import { identityHtml, renderTabs, runRow, type MyRun } from "./person-detail.ts";

// Person detail's pure render pieces (design-consolidation Phase 1, M5). The stage's
// mount is browser-only; these string renderers carry the look: the recap-header
// identity block (shared with run-detail), the ds-tabs shelf, and the history rows
// with an absolute house date + a trailing chevron.

const run: MyRun = {
  id: "r1",
  personId: "p1",
  headline: "Bi-weekly check-in",
  ctx: { name: "Ming", role: "UX Designer", seniority: "Staff", meetingType: "Bi-weekly check-in" },
  lastSeenAt: Date.UTC(2024, 10, 18, 12, 0, 0), // Mon 18 Nov 2024
  rating: { stars: 4 },
};

test("identity header wears the recap-header classes: avatar + display-size name", () => {
  const html = identityHtml("Ming");
  assert.match(html, /class="rd-profile"/);
  assert.match(html, /ds-avatar rd-avatar js-avatar" aria-hidden="true">M</);
  assert.match(html, /<h1 class="rd-name js-name">Ming<\/h1>/);
  assert.match(html, /person-summary js-sub/, "the quiet stat line sits under the name");
});

test("the header carries an actions row for the screen's one blue action", () => {
  const html = identityHtml("Ming");
  assert.match(html, /class="page-header__row"/);
  assert.match(html, /page-header__actions js-actions/);
});

test("identity block escapes the name and falls back to a ? avatar", () => {
  const html = identityHtml("");
  assert.match(html, /aria-hidden="true">\?</);
  assert.match(identityHtml("<b>x</b>"), /&lt;b&gt;x&lt;\/b&gt;/);
});

test("tabs: Overview default-active, Past 1:1s pane hidden behind its tab", () => {
  const html = renderTabs("<p>ov</p>", "<p>hist</p>");
  assert.match(html, /class="ds-tabs" role="tablist"/);
  assert.match(html, /ds-tab is-active" role="tab" aria-selected="true" data-tab="overview">Overview</);
  assert.match(html, /ds-tab" role="tab" aria-selected="false" data-tab="history">Past 1:1s</);
  assert.match(html, /data-pane="overview"><p>ov<\/p>/);
  assert.match(html, /data-pane="history" hidden><p>hist<\/p>/);
});

test("a history row shows the absolute house date beside the relative time", () => {
  const html = runRow(run);
  assert.match(html, /person-run__when"> · Mon 18 Nov 2024 · /, "Mon 18 Nov 2024, then how long ago");
});

test("a history row ends in a chevron so it signals clickable", () => {
  const html = runRow(run);
  // Lucide ChevronRight via the shared icon helper — its one path, aria-hidden.
  assert.match(html, /m9 18 6-6-6-6/);
  assert.match(html, /sero-icon/);
});

test("a history row keeps its open hook, id, and rating badge", () => {
  const html = runRow(run);
  assert.match(html, /class="person-run js-open" data-id="r1"/);
  assert.match(html, /aria-label="prep rating 4 out of 5"/);
  assert.match(html, /person-run__type">Bi-weekly check-in</);
});

test("an unrated row still renders (no badge, chevron intact)", () => {
  const html = runRow({ ...run, rating: null });
  assert.doesNotMatch(html, /prep rating/);
  assert.match(html, /m9 18 6-6-6-6/);
});
