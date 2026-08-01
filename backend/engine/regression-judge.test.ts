import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt, buildUserPayload, judgeRerun } from "./regression-judge.ts";
import type { CallAI, JudgeInput, JudgeRunInput } from "./regression-judge.ts";
import { REVIEW_DIM_KEYS } from "./run-projections.ts";

function run(over: Partial<JudgeRunInput> = {}): JudgeRunInput {
  return {
    transcript: [{ question: "How is the workload?", answer: "Fine I think." }],
    briefing: { summary: "A short recap." },
    trust: { verdict: "PASS", hard_fails: [] },
    ...over,
  };
}

function input(over: Partial<JudgeInput> = {}): JudgeInput {
  return {
    scenario: {
      name: "Devon",
      role: "Senior Engineer",
      seniority: "Senior",
      meetingType: "Growth & career plan",
      managerNotes: "Between us only: I worry Devon has been coasting.",
    },
    current: run(),
    baseline: null,
    ...over,
  };
}

/** A fake model that records what it was asked and returns a fixed verdict. */
function fakeCall(reply: Record<string, unknown>) {
  const seen: { system?: string; user?: string; model?: string; costLabel?: string; temperature?: number } = {};
  const call = (async (args: Record<string, unknown>) => {
    seen.system = String(args.system);
    seen.user = String(args.user);
    seen.model = String(args.model);
    seen.costLabel = String(args.costLabel);
    seen.temperature = Number(args.temperature);
    return JSON.stringify(reply);
  }) as unknown as CallAI;
  return { call, seen };
}

const eightPasses = REVIEW_DIM_KEYS.map((key) => ({ key, verdict: "pass", reason: "fine" }));

test("the rubric names all eight dimensions the review tool uses", () => {
  const system = buildSystemPrompt(false);
  for (const key of REVIEW_DIM_KEYS) {
    assert.ok(system.includes(key), `system prompt should name ${key}`);
  }
  assert.equal(REVIEW_DIM_KEYS.length, 8);
});

test("trust failures are explicitly scored down, not treated as nits", () => {
  const system = buildSystemPrompt(false);
  assert.match(system, /PRIVATE/);
  assert.match(system, /2 or below/);
  assert.match(system, /Never reward length/);
});

test("with no previous run, the judge is told to return no comparison", () => {
  const system = buildSystemPrompt(false);
  assert.match(system, /no previous run/i);
  assert.doesNotMatch(system, /improved, same or worse/);
});

test("with a previous run, the judge is asked for a head-to-head", () => {
  const system = buildSystemPrompt(true);
  assert.match(system, /improved, same or worse/);
  assert.match(system, /same manager setup and the same answers/);
  assert.match(system, /Judge the change, not the absolute quality/);
});

test("the payload carries both runs, and the private note for leak-checking", () => {
  const payload = buildUserPayload(input({ baseline: run({ briefing: { summary: "older" } }) })) as Record<string, unknown>;
  const scenario = payload.scenario as Record<string, unknown>;
  assert.match(String(scenario.manager_private_note), /coasting/);
  assert.ok(payload.new_run);
  assert.ok(payload.previous_run);
});

test("a skipped answer reaches the judge as skipped, not as empty text", () => {
  const payload = buildUserPayload(
    input({ current: run({ transcript: [{ question: "Q", answer: "", skipped: true }] }) })
  ) as Record<string, unknown>;
  const newRun = payload.new_run as Record<string, unknown>;
  const turns = newRun.transcript as Record<string, unknown>[];
  assert.equal(turns[0]?.answer, "(skipped)");
});

test("the first-ever rerun gets no comparison, even if the model invents one", () => {
  const { call } = fakeCall({
    score: 4,
    dimensions: eightPasses,
    head_to_head: { overall: "improved", dimensions: [], reason: "made up" },
    flags: [],
  });
  return judgeRerun(input({ baseline: null }), { callAI: call }).then((r) => {
    assert.equal(r.head_to_head, null, "a comparison with nothing to compare must be dropped");
    assert.equal(r.score, 4);
    assert.equal(r.dimensions.length, 8);
  });
});

test("a real comparison passes through when there is a baseline", async () => {
  const { call } = fakeCall({
    score: 2,
    dimensions: eightPasses,
    head_to_head: {
      overall: "worse",
      dimensions: [{ key: "no_overreach", delta: "worse" }],
      reason: "the recap invents a deadline the manager never gave",
    },
    flags: ["invented commitment"],
  });
  const r = await judgeRerun(input({ baseline: run() }), { callAI: call });
  assert.equal(r.head_to_head?.overall, "worse");
  assert.match(String(r.head_to_head?.reason), /invents a deadline/);
  assert.deepEqual(r.flags, ["invented commitment"]);
});

test("a dimension the review tool does not have is dropped, not surfaced", async () => {
  const { call } = fakeCall({
    score: 3,
    dimensions: [...eightPasses, { key: "invented_dimension", verdict: "fail", reason: "nope" }],
    head_to_head: null,
    flags: [],
  });
  const r = await judgeRerun(input(), { callAI: call });
  assert.equal(r.dimensions.length, 8);
  assert.equal(r.dimensions.some((d) => d.key === "invented_dimension"), false);
});

test("the call uses the strong judge tier and is labelled for the cost log", async () => {
  const { call, seen } = fakeCall({ score: 5, dimensions: eightPasses, head_to_head: null, flags: [] });
  await judgeRerun(input(), { callAI: call, model: "gpt-test" });
  assert.equal(seen.model, "gpt-test");
  assert.equal(seen.costLabel, "regression-judge");
  assert.equal(seen.temperature, 0.1);
});
