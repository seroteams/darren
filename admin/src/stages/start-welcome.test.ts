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
import { firstVisitHtml, videoIframeHtml, SAMPLE_BRIEF, POSITIONING_LINE, VIDEO, STEPS } from "./start-welcome.ts";

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

test("a stranger is told how it works, in four steps, benefit first", () => {
  assert.equal(STEPS.length, 4, "four steps, matching the copy on the screen");
  for (const [i, s] of STEPS.entries()) {
    assert.ok(html.includes(s.benefit), `step ${i + 1}: the benefit is rendered`);
    assert.ok(html.includes(s.title), `step ${i + 1}: the mechanism is rendered`);
    assert.ok(
      html.indexOf(s.benefit) < html.indexOf(s.title),
      `step ${i + 1}: benefit comes before the mechanism (Dunford seat, committee 2026-07-26)`,
    );
  }
});

test("every step answers a named problem, and the pairing survives one column", () => {
  // Version B's whole argument is the pairing. The complaint must render immediately
  // before the step that answers it, because the phone layout is this same DOM order at
  // one column: quote, answer, quote, answer.
  for (const [i, s] of STEPS.entries()) {
    assert.ok(html.includes(s.pain), `step ${i + 1}: the complaint is rendered`);
    assert.ok(
      html.indexOf(s.pain) < html.indexOf(s.benefit),
      `step ${i + 1}: the complaint comes before the answer to it`,
    );
    if (i > 0) {
      assert.ok(
        html.indexOf(STEPS[i - 1].benefit) < html.indexOf(s.pain),
        `step ${i + 1}: its complaint comes after the previous answer, so the pairs interleave`,
      );
    }
  }
});

test("the complaints are things managers say, not verdicts on them", () => {
  // Rogelberg seat, committee 2026-07-26. Reported behaviour survives being read by the
  // manager it describes; a judgement on their management does not.
  for (const s of STEPS) {
    assert.ok(!/\bfail(ing|ure|ed)?\b/i.test(s.pain), `"${s.pain}" reads as a verdict`);
    assert.ok(!/\bbad\b|\bpoor\b|\bterrible\b/i.test(s.pain), `"${s.pain}" reads as a verdict`);
  }
});

test("the action sits above the teaching, not below it", () => {
  // Seibel seat, committee 2026-07-26: four steps of education is four chances to
  // bounce, so the way in must never be pushed under them.
  assert.ok(
    html.indexOf("js-start-slot") < html.indexOf(STEPS[0].pain),
    "the button slot is rendered before the complaint-and-answer grid",
  );
  assert.ok(
    html.indexOf(STEPS[3].benefit) < html.indexOf("Sample brief"),
    "the steps explain before the sample proves",
  );
});

test("the walkthrough is a line of text, not a black rectangle", () => {
  // The old poster was the biggest, darkest object on the screen and on live it was
  // showing YouTube Error 153. It is a link now.
  assert.ok(!html.includes("start-video__poster"), "no 16:9 poster block");
  assert.ok(html.includes("start-video__link"), "a text link does the asking instead");
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
    // Escapes, not the characters themselves: the copy linter scans this repo too.
    assert.ok(!markup.includes("\u2014"), `${label}: no em dash (house rule)`);
    assert.ok(!markup.includes(" \u2013 "), `${label}: no en dash separator either`);
    assert.ok(!markup.includes("!"), `${label}: no exclamation marks`);
    for (const m of markup.matchAll(/font-size:\s*(\d+)px/g)) {
      assert.ok(Number(m[1]) >= 14, `${label}: inline font-size ${m[1]}px below the 14 floor`);
    }
  }
});
