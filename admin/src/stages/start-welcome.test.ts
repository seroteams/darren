// The "start typing" welcome (Carl picked option B of five, 2026-07-27). start-core.js
// mounts through the DOM, so its own guard reads source text; these are the real
// behaviour tests.
//
// The rule that matters most here: SAMPLE_BRIEF is the seeded example's REAL prep
// brief, not copy written to look like one. The welcome no longer renders it, but five
// prototypes quote it and the example run is still one click from this screen, so the
// drift test stays: if the fixture changes, this file fails rather than letting the
// product quietly show a brief the manager can no longer find anywhere.
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
  NOTES_PLACEHOLDER,
  HEADLINE,
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

test("the screen asks a question and gives somewhere to answer it", () => {
  assert.ok(html.includes("Welcome to Sero"), "names the product");
  assert.ok(html.includes(HEADLINE), "the headline is the question");
  assert.ok(html.includes("js-first-notes"), "the notes box carries the hook Home reads on submit");
  assert.ok(/<textarea/.test(html), "it is a real input, not a picture of one");
  assert.ok(
    html.indexOf(HEADLINE) < html.indexOf("js-first-notes"),
    "the question comes before the box that answers it",
  );
});

test("the empty box teaches the input style by being an example of it", () => {
  assert.ok(html.includes(NOTES_PLACEHOLDER), "the placeholder is rendered");
  assert.ok(!/^[A-Z]/.test(NOTES_PLACEHOLDER), "fragments, not sentences: no leading capital");
  assert.ok(NOTES_PLACEHOLDER.includes("\n"), "more than one line, so it reads as rough notes");
  assert.ok(
    NOTES_PLACEHOLDER.toLowerCase().includes(SAMPLE_BRIEF.name.toLowerCase()),
    "the same person as the example run: one story on this screen, not two",
  );
});

test("the button sits in the box, and is still Home's ONE blue button", () => {
  assert.ok(html.includes("js-start-slot"), "the slot is there for Home to move its button into");
  assert.ok(!/class="btn\b/.test(html), "no second accent button is created here");
  assert.ok(
    html.indexOf("js-first-notes") < html.indexOf("js-start-slot"),
    "the box is above its own submit",
  );
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

test("the screen stays short: no complaint grid, no sample document", () => {
  // The whole point of this rebuild. The previous welcome ran 1421px tall because it
  // carried an eight-cell "what managers tell us" grid and a full sample brief before
  // the manager could start anything.
  assert.ok(!html.includes("start-step"), "no four-step teaching block");
  assert.ok(!html.includes("start-pain"), "no grid of manager complaints");
  assert.ok(!html.includes("start-sample__body"), "no sample brief document");
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
