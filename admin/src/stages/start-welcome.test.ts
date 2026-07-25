// The brief-first welcome (onboarding-firstrun Phase 2). start-core.js mounts through
// the DOM, so its own guard reads source text; these are the real behaviour tests.
//
// The rule that matters most here: the sample brief on the welcome screen is the
// seeded example's REAL prep brief, not copy written to look like one. If the fixture
// ever changes, this file fails rather than letting the screen quietly show a brief
// the manager can no longer find anywhere in the product.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { firstVisitHtml, videoIframeHtml, SAMPLE_BRIEF, POSITIONING_LINE, VIDEO } from "./start-welcome.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, "../../../content/demo/demo-run.json"), "utf8"));

const html = firstVisitHtml();
const withLink = firstVisitHtml({ exampleRunId: "run-123" });

test("the sample brief is the seeded example's real prep brief, verbatim", () => {
  const brief = fixture.state.preparationResult.brief;
  const ctx = fixture.state.ctx;
  assert.equal(SAMPLE_BRIEF.name, ctx.name, "same person as the example run");
  assert.equal(SAMPLE_BRIEF.meetingType, ctx.meetingType, "same meeting type");
  assert.equal(SAMPLE_BRIEF.open, brief.openingQuestion, "How to open = the real opening question");
  assert.equal(SAMPLE_BRIEF.explore, brief.coreIssue, "What to explore = the real core issue");
  assert.equal(SAMPLE_BRIEF.listenFor, brief.listenFor[0], "What to listen for = the real first listen-for");
});

test("the sample says it is a sample, on its face", () => {
  assert.ok(html.includes("Sample brief"), "the card is labelled");
  assert.ok(html.includes("How to open") && html.includes("What to explore") && html.includes("What to listen for"), "the three sections are named");
  assert.ok(html.includes(SAMPLE_BRIEF.open), "the real brief text is rendered");
});

test("a stranger is told what Sero is and when to use it", () => {
  assert.ok(html.includes("Welcome to Sero"), "names the product");
  assert.ok(html.includes(POSITIONING_LINE), "the trigger line is on the screen");
  assert.ok(/before your next 1:1/i.test(POSITIONING_LINE), "the line carries the moment of use, not just the promise");
});

test("the example link only exists when there is an example to open", () => {
  assert.ok(!html.includes("js-open-example"), "no link without a run id: never a dead end");
  assert.ok(withLink.includes('js-open-example'), "the link appears when the account has the seeded run");
  assert.ok(withLink.includes('data-id="run-123"'), "it carries the run id");
});

test("the screen hosts Home's ONE blue button and brings none of its own", () => {
  assert.ok(html.includes("js-start-slot"), "the slot is there for Home to move its button into");
  assert.ok(!/class="btn\b/.test(html), "no second accent button is created here");
});

test("nothing reaches YouTube until the manager clicks play", () => {
  assert.ok(!/youtube|iframe/i.test(html), "the first paint carries no player and no third-party URL");
  assert.ok(html.includes("js-play-video"), "a local poster button does the asking");
  const frame = videoIframeHtml();
  assert.ok(frame.includes("youtube-nocookie.com"), "privacy-mode host");
  assert.ok(frame.includes(`start=${VIDEO.startSeconds}`), "starts where the walkthrough starts");
  assert.ok(frame.includes("autoplay=1"), "the click was the play, so autoplay is honest");
});

test("copy: UK English, no em dashes, no exclamation marks, no sub-14px inline font-size", () => {
  for (const [label, markup] of [["welcome", html], ["welcome+link", withLink]] as const) {
    // Escapes, not the characters themselves: the copy linter scans this repo too.
    assert.ok(!markup.includes("\u2014"), `${label}: no em dash (house rule)`);
    assert.ok(!markup.includes(" \u2013 "), `${label}: no en dash separator either`);
    assert.ok(!markup.includes("!"), `${label}: no exclamation marks`);
    for (const m of markup.matchAll(/font-size:\s*(\d+)px/g)) {
      assert.ok(Number(m[1]) >= 14, `${label}: inline font-size ${m[1]}px below the 14 floor`);
    }
  }
});
