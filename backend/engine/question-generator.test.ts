import test from "node:test";
import assert from "node:assert/strict";
import { RESPONSE_SCHEMA, isCompoundName, isKnownStage, toHints, pinPrepOpenerEarly } from "./question-generator.ts";
import type { Question } from "../shared/question.types.ts";

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

// Coaching hints: exactly 3 tagged entries per question; toHints is the gate
// that keeps only clean ones off the wire.
test("RESPONSE_SCHEMA: hints are exactly 3, tagged ask/listen", () => {
  const hints = RESPONSE_SCHEMA.properties.questions.items.properties.hints;
  assert.equal(hints.minItems, 3);
  assert.equal(hints.maxItems, 3);
  assert.deepEqual(hints.items.properties.kind.enum, ["ask", "listen"]);
});

// THE REGRESSION GUARD. The call runs with strict structured outputs, where
// OpenAI rejects any schema whose `required` omits a key in `properties` — the
// whole request 400s. `hints` was added to properties only (19 Jul 2026), and
// generateBankWithFallback swallowed the 400 into the 8 static _seed questions,
// so live meetings ran on generic questions for nine days in silence. This
// walks the WHOLE schema, so the next field added can't repeat it.
test("RESPONSE_SCHEMA: every property is listed in required (strict mode)", () => {
  const gaps: string[] = [];
  const walk = (node: Record<string, unknown>, path: string): void => {
    if (!node || typeof node !== "object") return;
    const props = node.properties as Record<string, Record<string, unknown>> | undefined;
    if (node.type === "object" && props) {
      const required = Array.isArray(node.required) ? (node.required as string[]) : [];
      for (const key of Object.keys(props)) {
        if (!required.includes(key)) gaps.push(`${path}.${key}`);
        walk(props[key] as Record<string, unknown>, `${path}.${key}`);
      }
    }
    if (node.type === "array" && node.items) walk(node.items as Record<string, unknown>, `${path}[]`);
  };
  walk(RESPONSE_SCHEMA as unknown as Record<string, unknown>, "");
  assert.deepEqual(gaps, [], `missing from required: ${gaps.join(", ")}`);
});

test("toHints keeps valid ask/listen entries and caps at 3", () => {
  const out = toHints([
    { kind: "ask", text: "Ask slowly." },
    { kind: "listen", text: "Energy words." },
    { kind: "ask", text: "Use their word back." },
    { kind: "listen", text: "One too many." },
  ]);
  assert.equal(out.length, 3);
  assert.deepEqual(out[0], { kind: "ask", text: "Ask slowly." });
});

test("toHints drops malformed entries and non-arrays", () => {
  assert.deepEqual(toHints(undefined), []);
  assert.deepEqual(toHints("nope"), []);
  assert.deepEqual(
    toHints([{ kind: "coach", text: "wrong kind" }, { kind: "ask", text: "" }, { kind: "listen", text: "  keep me  " }]),
    [{ kind: "listen", text: "keep me" }],
  );
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

// Living plan (no dead wires P3): the prep-opener pin exists so the planner
// cannot bury the one prep-anchored question early on — but after three asked
// questions the window has passed and the planner owns the order.
function pinQ(alias: string): Question {
  return {
    alias,
    label: "Test",
    name: `Question ${alias}?`,
    description: "d",
    purpose: "topic",
    stage: "pulse",
    axis_effects: { engagement: 1 },
    source: "generated",
  } as unknown as Question;
}

test("pinPrepOpenerEarly: still pins the opener while fewer than three questions have been asked", () => {
  const opener = { ...pinQ("q_prep"), label: "Prep opener" };
  const out = pinPrepOpenerEarly([pinQ("q_a"), pinQ("q_b")], opener, new Set(["q_1"]), "Bi-weekly check-in");
  assert.ok(out.some((q) => q.alias === "q_prep"), "the opener must be re-inserted early in the run");
});

test("pinPrepOpenerEarly: releases the pin after three asked questions", () => {
  const opener = { ...pinQ("q_prep"), label: "Prep opener" };
  const out = pinPrepOpenerEarly([pinQ("q_a"), pinQ("q_b")], opener, new Set(["q_1", "q_2", "q_3"]), "Bi-weekly check-in");
  assert.deepEqual(
    out.map((q) => q.alias),
    ["q_a", "q_b"],
    "after three asked questions the planner owns the order; no forced re-insert"
  );
});
