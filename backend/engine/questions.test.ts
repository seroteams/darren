import test from "node:test";
import assert from "node:assert/strict";
import { stringifyYaml, parseYaml } from "./questions.ts";

// question-support-hints Phase 1. The codec used to have no list support, so a
// question's `hints` array hit emitScalar's String(v) and every saved copy read
// `hints: [object Object],[object Object]` — destroyed on write, unreadable on
// load. These tests pin the round trip so a saved question keeps its coaching.

const HINTS = [
  { kind: "ask", text: "Ask it plainly, then leave the silence" },
  { kind: "listen", text: "Whether he names a date, or talks around it" },
  { kind: "listen", text: 'Whether "beta test" means the same thing to you both' },
];

const question = {
  alias: "q_beta_scope",
  label: "Beta scope",
  name: "What has to be true for the beta to go out this month?",
  description: "Tells you whether the date is planned or hoped for.",
  purpose: "topic",
  stage: "explore",
  axis_effects: { clarity: 3, engagement: 1 },
  source: "generated",
  hints: HINTS,
};

test("hints survive a save and a read (the whole point of Phase 1)", () => {
  const back = parseYaml(stringifyYaml(question));
  assert.deepEqual(back.hints, HINTS);
});

test("the rest of the question is untouched by list support", () => {
  const back = parseYaml(stringifyYaml(question));
  assert.equal(back.alias, "q_beta_scope");
  assert.equal(back.name, "What has to be true for the beta to go out this month?");
  assert.equal(back.purpose, "topic");
  assert.equal(back.stage, "explore");
  assert.deepEqual(back.axis_effects, { clarity: 3, engagement: 1 });
  assert.equal(back.source, "generated");
});

test("no line ever reads [object Object] again", () => {
  assert.ok(!stringifyYaml(question).includes("[object Object]"));
});

test("hint text with a colon, a quote or a dash round-trips verbatim", () => {
  const tricky = [
    { kind: "ask", text: "Name the thing first: the date, not the feeling" },
    { kind: "listen", text: 'Whether they say "it depends" and stop there' },
  ];
  const back = parseYaml(stringifyYaml({ ...question, hints: tricky }));
  assert.deepEqual(back.hints, tricky);
});

test("an empty hints list is written as nothing, not an empty key", () => {
  const yaml = stringifyYaml({ ...question, hints: [] });
  assert.ok(!yaml.includes("hints"));
  assert.equal(parseYaml(yaml).hints, undefined);
});

test("a question with no hints is byte-identical to before list support", () => {
  const { hints, ...bare } = question;
  void hints;
  assert.equal(
    stringifyYaml(bare),
    [
      "alias: q_beta_scope",
      "label: Beta scope",
      "name: What has to be true for the beta to go out this month?",
      "description: Tells you whether the date is planned or hoped for.",
      "purpose: topic",
      "stage: explore",
      "axis_effects:",
      "  clarity: +3",
      "  engagement: +1",
      "source: generated",
      "",
    ].join("\n"),
  );
});

test("a field after the list is still read (the block ends where it should)", () => {
  const yaml =
    "alias: q_x\nhints:\n  - kind: listen\n    text: What they skip over\nsource: generated\n";
  const back = parseYaml(yaml);
  assert.deepEqual(back.hints, [{ kind: "listen", text: "What they skip over" }]);
  assert.equal(back.source, "generated");
});

test("the old corrupted files parse without throwing, and carry no hints", () => {
  // 22 questions on disk still hold the pre-fix garbage. They must keep working
  // as questions; toHints already rejects a non-array, so they read as hint-less.
  const back = parseYaml("alias: q_old\nhints: [object Object],[object Object]\nsource: generated\n");
  assert.equal(back.alias, "q_old");
  assert.ok(!Array.isArray(back.hints));
  assert.equal(back.source, "generated");
});
