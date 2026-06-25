#!/usr/bin/env node
// Per-dimension SUGGESTION judge — assistant only. Produces a pass/fail + one-line
// reason for each of the 8 review dimensions, grounded in the run data. The human
// reviewer (Carl) always overrides; these are starting suggestions, not verdicts.

const { loadEnv } = require("../backend/engine/env.ts");
loadEnv();
const { callAI, parseAIJson } = require("../backend/engine/ai-client.ts");
const { modelFor } = require("../backend/engine/models.ts");

const DIMS = [
  ["role_aware", "Role / seniority / meeting awareness", "Is the PREP specific to this person & meeting, or generic coaching?"],
  ["grounded", "Grounded / no over-inference", "Does every claim trace to the setup note + answers? Nothing invented."],
  ["useful", "Useful & short enough", "Would a real manager walk in more prepared? Concise?"],
  ["trust", "Trust boundary", "No private manager judgement leaked into served output."],
  ["arc", "Right arc for the meeting", "Did questions move through the correct arc stages for this meeting type?"],
  ["adapt", "Adapts to the person", "Do questions shift with role/seniority/notes/prior answers, or run a fixed template?"],
  ["next_q", "Questions are useful", "Does each question earn its place (not filler, not presupposing, not repetitive)?"],
  ["briefing", "Final briefing is evidence-based", "Are conclusions backed by what was actually said, with hedged causes — not invented specifics?"],
];

function schema() {
  const props = {};
  for (const [key] of DIMS) {
    props[key] = {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["pass", "fail"] },
        reason: { type: "string" },
      },
      required: ["verdict", "reason"],
      additionalProperties: false,
    };
  }
  return { type: "object", properties: props, required: DIMS.map((d) => d[0]), additionalProperties: false };
}

async function judgeDimensions(payload, { model = modelFor("judge") } = {}) {
  const system = [
    "You are an assistant helping a human QA reviewer judge a manager 1:1 prep run.",
    "For each dimension, SUGGEST pass or fail with ONE short, concrete reason (max ~20 words).",
    "Be honest and critical — a suggestion the reviewer trusts is one that flags real problems.",
    "Ground every call in the provided data; do not invent. If a dimension can't move through stages",
    "(e.g. all questions share one stage), that is a fail for 'arc'. If the briefing states a cause",
    "as fact that the notes/answers don't support, that is a fail for 'grounded' and 'briefing'.",
    "These are SUGGESTIONS only — the human decides. Return JSON only.",
  ].join("\n");

  const user = [
    "Dimensions to score (key — definition):",
    DIMS.map(([k, l, d]) => `- ${k} (${l}): ${d}`).join("\n"),
    "",
    "RUN DATA:",
    JSON.stringify({
      persona: { name: payload.name, role: payload.role, seniority: payload.seniority, meeting: payload.meeting },
      manager_setup_note: payload.notes,
      prep_brief: payload.brief,
      prep_validator_issues: payload.prepIssues,
      questions_and_replies: (payload.questions || []).map((q) => ({ stage: q.stage, question: q.name, manager_note: q.note })),
      arc: payload.arc,
      served_question_lint: payload.servedLint,
      trust_check: payload.trust,
      final_briefing: payload.briefing,
    }, null, 2),
  ].join("\n");

  const raw = await callAI({
    system, user, schema: schema(), schemaName: "dimension_suggestions",
    temperature: 0.1, model, costLabel: "suggest-judge",
  });
  return parseAIJson(raw, "Suggest judge", DIMS.map((d) => d[0]));
}

module.exports = { judgeDimensions, SUGGEST_DIMS: DIMS };
