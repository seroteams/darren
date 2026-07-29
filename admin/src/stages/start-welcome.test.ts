// The "three focus points" welcome (Carl picked option C of five, 2026-07-29).
// start-core.js mounts through the DOM, so its own guard reads source text; these are
// the real behaviour tests.
//
// The rule that matters most here: SAMPLE_BRIEF is the seeded example's REAL prep
// brief, not copy written to look like one. This screen now renders it as its main
// object, so the drift test is load-bearing rather than archival: if the fixture
// changes, this file fails rather than letting a newcomer's first impression of Sero
// drift away from what the engine actually returns.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  firstVisitHtml,
  videoIframeHtml,
  SAMPLE_BRIEF,
  POSITIONING_LINE,
  POINT_LABELS,
  HEADLINE,
  LEDE,
  VIDEO,
} from "./start-welcome.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, "../../../content/demo/demo-run.json"), "utf8"));

const html = firstVisitHtml();
const withLink = firstVisitHtml({ exampleRunId: "run-123" });

// The two banned dashes, assembled rather than written down (see the copy test below).
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

test("the sample brief is the seeded example's real prep brief, verbatim", () => {
  const brief = fixture.state.preparationResult.brief;
  const ctx = fixture.state.ctx;
  assert.equal(SAMPLE_BRIEF.name, ctx.name, "same person as the example run");
  assert.equal(SAMPLE_BRIEF.meetingType, ctx.meetingType, "same meeting type");
  assert.equal(SAMPLE_BRIEF.open, brief.openingQuestion, "How to open = the real opening question");
  assert.equal(SAMPLE_BRIEF.explore, brief.coreIssue, "What to explore = the real core issue");
  assert.equal(SAMPLE_BRIEF.listenFor, brief.listenFor[0], "What to listen for = the real first listen-for");
});

test("the screen shows the real output, not a description of it", () => {
  assert.ok(html.includes("Welcome to Sero"), "names the product");
  assert.ok(html.includes(HEADLINE), "the headline names what a manager walks away with");
  assert.ok(html.includes(LEDE), "the lede frames the card as an output");
  for (const text of [SAMPLE_BRIEF.open, SAMPLE_BRIEF.explore, SAMPLE_BRIEF.listenFor]) {
    assert.ok(html.includes(text), "each of the three real points is rendered verbatim");
  }
  assert.ok(html.includes(SAMPLE_BRIEF.name), "the card says whose brief this is");
  assert.ok(html.includes(SAMPLE_BRIEF.meetingType), "and which meeting it was for");
});

test("the three points are numbered and labelled with the words the real brief uses", () => {
  assert.equal(POINT_LABELS.length, 3, "three, as the headline promises");
  for (const label of POINT_LABELS) assert.ok(html.includes(label), `${label} is on the card`);
  assert.ok(/<ol class="start-points">/.test(html), "an ordered list, so the numbering is real");
  assert.equal((html.match(/class="start-point"/g) || []).length, 3, "exactly three points, never a fourth");
  assert.ok(
    html.indexOf(POINT_LABELS[0]) < html.indexOf(POINT_LABELS[1]) &&
      html.indexOf(POINT_LABELS[1]) < html.indexOf(POINT_LABELS[2]),
    "open, then explore, then listen for: the order of the conversation",
  );
});

test("the card is labelled as an example, so it is never mistaken for the manager's own", () => {
  assert.ok(html.includes("Example brief"), "the card carries the tag");
  assert.ok(
    html.indexOf("Example brief") < html.indexOf(SAMPLE_BRIEF.open),
    "the label is read before the content it labels",
  );
});

test("the button sits above the card, and is still Home's ONE blue button", () => {
  assert.ok(html.includes("js-start-slot"), "the slot is there for Home to move its button into");
  assert.ok(!/class="btn\b/.test(html), "no second accent button is created here");
  assert.ok(
    html.indexOf("js-start-slot") < html.indexOf("start-brief"),
    "the way in comes before the proof, so it is never below a card a newcomer has to scroll past",
  );
  assert.ok(!/<textarea/.test(html), "no notes box: option B's input is gone with option B");
});

test("what happens after the button is on the screen, in one line", () => {
  assert.ok(html.includes(POSITIONING_LINE), "the line is rendered");
  assert.ok(
    /asks you (two|three|a few)/i.test(POSITIONING_LINE),
    "it names the back and forth in the middle, or the brief looks like it came from nowhere",
  );
  assert.ok(/focus points/i.test(POSITIONING_LINE), "it names what comes out");
  assert.ok(/sharper|better/i.test(POSITIONING_LINE), "it names the reason to run a second one");
});

test("the screen stays short: no complaint grid, no full sample document", () => {
  // The whole point of this rebuild. The 2026-07-26 welcome ran 1421px tall because it
  // carried an eight-cell "what managers tell us" grid and a whole sample brief before
  // the manager could start anything. Three points is an excerpt, not that document.
  assert.ok(!html.includes("start-step"), "no four-step teaching block");
  assert.ok(!html.includes("start-pain"), "no grid of manager complaints");
  assert.ok(!html.includes("start-sample__body"), "no full sample brief document");
  assert.ok(!/<section/.test(html), "one block, not a stack of sections");
});

test("the example link only exists when there is an example to open", () => {
  assert.ok(!html.includes("js-open-example"), "no link without a run id: never a dead end");
  assert.ok(withLink.includes("js-open-example"), "the link appears when the account has the seeded run");
  assert.ok(withLink.includes('data-id="run-123"'), "it carries the run id");
});

test("the walkthrough is a line of text, not a black rectangle", () => {
  assert.ok(!html.includes("start-video__poster"), "no 16:9 poster block");
  assert.ok(html.includes("start-quiet__link"), "a quiet text link does the asking instead");
});

test("nothing reaches YouTube until the manager clicks play", () => {
  assert.ok(!/youtube|iframe/i.test(html), "the first paint carries no player and no third-party URL");
  assert.ok(html.includes("js-play-video"), "a local button does the asking");
  const frame = videoIframeHtml();
  assert.ok(frame.includes("youtube-nocookie.com"), "privacy-mode host");
  assert.ok(frame.includes(`start=${VIDEO.startSeconds}`), "starts where the walkthrough starts");
  assert.ok(frame.includes("autoplay=1"), "the click was the play, so autoplay is honest");
});

test("the player still carries the referrerpolicy that keeps YouTube from erroring", () => {
  // This one exists because it has already broken once. d3dcbc45 (a hardening pass)
  // changed this attribute to no-referrer and shipped it; the live welcome then showed
  // YouTube "Error 153, video player configuration error" instead of a player, because
  // the player identifies the embedding site from the HTTP Referer and there was none.
  //
  // The site-wide header is Referrer-Policy: same-origin, which strips the referrer on
  // every cross-origin request, so this per-element override is the only thing making
  // the video work at all. Both halves are asserted: if a future pass loosens the header
  // this test says so, and if a future pass strips the attribute this test fails.
  const frame = videoIframeHtml();
  assert.ok(
    frame.includes('referrerpolicy="strict-origin-when-cross-origin"'),
    "the iframe overrides the site's referrer policy (YouTube's own oEmbed snippet uses this exact value)",
  );
  assert.ok(!/referrerpolicy="no-referrer"/.test(frame), "no-referrer here is the Error 153 bug");

  const middleware = readFileSync(join(here, "../../../backend/api/middleware/security-headers.ts"), "utf8");
  assert.ok(
    /Referrer-Policy",\s*"same-origin"/.test(middleware),
    "the header this attribute exists to override is still same-origin: if it changed, revisit the comment above",
  );
});

test("copy: UK English, no em dashes, no exclamation marks, no sub-14px inline font-size", () => {
  for (const [label, markup] of [["welcome", html], ["welcome+link", withLink]] as const) {
    // Built from char codes, never typed: the copy linter scans this repo too, so a
    // literal em dash here would fail `npm run lint:copy` on the test that guards it.
    assert.ok(!markup.includes(EM_DASH), `${label}: no em dash (house rule)`);
    assert.ok(!markup.includes(` ${EN_DASH} `), `${label}: no en dash separator either`);
    assert.ok(!markup.includes("!"), `${label}: no exclamation marks`);
    for (const m of markup.matchAll(/font-size:\s*(\d+)px/g)) {
      assert.ok(Number(m[1]) >= 14, `${label}: inline font-size ${m[1]}px below the 14 floor`);
    }
  }
});
