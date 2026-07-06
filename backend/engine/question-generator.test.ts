import test from "node:test";
import assert from "node:assert/strict";
import { RESPONSE_SCHEMA, isCompoundName, isKnownStage } from "./question-generator.ts";

// The structured-output schema is the first hard gate on model output. These
// bounds mirror the prompt's <rules> ("8–12 questions", "axis_effects never
// empty", "never more than 3 axes") so a malformed bank is rejected at the API
// boundary, not patched up silently downstream.

test("RESPONSE_SCHEMA: questions array is bounded to 8–12 items", () => {
  const questions = RESPONSE_SCHEMA.properties.questions;
  assert.equal(questions.minItems, 8);
  assert.equal(questions.maxItems, 12);
});

test("RESPONSE_SCHEMA: axis_effects is non-empty and capped at 3", () => {
  const axisEffects = RESPONSE_SCHEMA.properties.questions.items.properties.axis_effects;
  assert.equal(axisEffects.minItems, 1);
  assert.equal(axisEffects.maxItems, 3);
});

// Name lint — a bank question must carry a single probe. The backstop drops
// compound names (two "?") and smuggled generic tails; it must NOT trip on a
// single coordinated clause that adds cause or a trade-off.
test("isCompoundName: two question marks is compound", () => {
  assert.equal(isCompoundName("How's the launch? Any concerns?"), true);
});

test("isCompoundName: a generic filler tail is compound", () => {
  assert.equal(isCompoundName("Walk me through the launch — what do you think?"), true);
  assert.equal(isCompoundName("Where are things at, anything else?"), true);
});

test("isCompoundName: a single coordinated clause is one probe", () => {
  assert.equal(isCompoundName("Where's the pace at for you right now — and what's driving that?"), false);
  assert.equal(isCompoundName("What do you think is behind the slip?"), false);
});

// Stage gate — the stage must name a real arc stage for the meeting type.
test("isKnownStage: accepts a real arc stage, rejects a bogus one", () => {
  assert.equal(isKnownStage("landing", "something_feels_off"), true);
  assert.equal(isKnownStage("support", "something_feels_off"), true);
  assert.equal(isKnownStage("closer", "something_feels_off"), false);
  assert.equal(isKnownStage(null, "something_feels_off"), false);
});
