import { test } from "node:test";
import assert from "node:assert/strict";
import { flowInterstitial } from "./flow-interstitial.ts";

// The one waiting screen for the flow's generation moments (design-consolidation
// Phase 3): centred orb slot + the current step's name + a skeleton slot, identical
// for Bank and Eval. Pure string render; hosts mount the orb/skeleton into the hooks.

test("renders centred wrapper with orb slot, step label and skeleton slot", () => {
  const html = flowInterstitial({ step: "Questions" });
  assert.ok(html.includes('class="flow-interstitial"'), "wrapper");
  assert.ok(html.includes("js-fi-orb"), "orb mount hook");
  assert.match(html, /flow-interstitial__step[^>]*>Questions</, "step name shown");
  assert.ok(html.includes("js-fi-skeleton"), "skeleton mount hook");
  assert.ok(html.indexOf("js-fi-orb") < html.indexOf("js-fi-skeleton"), "orb above skeleton");
});

test("escapes the step label", () => {
  const html = flowInterstitial({ step: "<b>x</b>" });
  assert.ok(!html.includes("<b>x</b>"), "escaped");
});
