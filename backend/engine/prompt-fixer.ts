// Learning loop: given the exact prompt a stage used, what it produced, and the
// tester's structured verdict, ask the model for ONE minimal prompt edit. Returns
// strict JSON only — display-only, the tester applies it by hand (no auto-apply).

import { modelFor } from "./models.ts";
import { callAI, parseAIJson } from "./ai-client.ts";

// Map a pipeline stage to its editable prompt template + the run-folder log dir.
const STAGE_MAP: Record<string, { file: string; dir: string }> = {
  focus_points: { file: "prompts/generate-focus-points.md", dir: "01-focus-points" },
  preparation: { file: "prompts/preparation.md", dir: "01b-preparation" },
  bank: { file: "prompts/generate-questions.md", dir: "03-question-bank" },
  questioning: { file: "prompts/plan-turn.md", dir: "04-dynamic-answers" },
  evaluation: { file: "prompts/final-evaluation.md", dir: "05-evaluation" },
  briefing: { file: "prompts/final-evaluation.md", dir: "05-evaluation" },
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    stage: { type: "string" },
    file: { type: "string" },
    problem: { type: "string" },
    minimal_prompt_rule: { type: "string" },
    why_this_fix: { type: "string" },
    regression_risk: { type: "string" },
    test_against: { type: "string" },
  },
  required: [
    "stage",
    "file",
    "problem",
    "minimal_prompt_rule",
    "why_this_fix",
    "regression_risk",
    "test_against",
  ],
  additionalProperties: false,
};

const SYSTEM = `You are a prompt engineer improving a 1:1-prep AI called Sero.
You are given: the EXACT prompt a stage used, the OUTPUT it produced, and the human tester's verdict on why it's wrong.
Propose the SMALLEST possible edit to the prompt that fixes the tester's complaint — one rule, not a rewrite.
Be concrete and grounded in the tester's verdict; do not invent problems they did not raise.
Return STRICT JSON only, matching the schema. No prose, no markdown, no code fences.`;

interface FixVerdict {
  verdict?: string;
  issue_type?: string;
  note?: string;
}
interface FixCtx {
  name?: string;
  seniority?: string;
  role?: string;
  meetingType?: string;
}

function buildUser({
  stage,
  file,
  promptText,
  responseText,
  verdict,
  ctx,
}: {
  stage: string;
  file: string;
  promptText?: string;
  responseText?: string;
  verdict?: FixVerdict | null;
  ctx?: FixCtx | null;
}): string {
  return [
    `Stage: ${stage}`,
    `Prompt template file: ${file}`,
    ctx ? `Persona: ${ctx.name || ""} — ${ctx.seniority || ""} ${ctx.role || ""} — ${ctx.meetingType || ""}`.trim() : "",
    ``,
    `TESTER VERDICT: ${verdict?.verdict || "(none)"}`,
    `ISSUE TYPE: ${verdict?.issue_type || "(none)"}`,
    `TESTER NOTE: ${verdict?.note || "(none)"}`,
    ``,
    `--- THE PROMPT THE STAGE USED ---`,
    promptText || "(prompt unavailable)",
    ``,
    `--- WHAT IT PRODUCED ---`,
    responseText || "(response unavailable)",
    ``,
    `Return the JSON fix now.`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

function stageInfo(stage: string): { file: string; dir: string } {
  return STAGE_MAP[stage] || STAGE_MAP.evaluation || { file: "prompts/final-evaluation.md", dir: "05-evaluation" };
}

async function suggestFix(
  {
    stage,
    promptText,
    responseText,
    verdict,
    ctx,
  }: {
    stage: string;
    promptText?: string;
    responseText?: string;
    verdict?: FixVerdict | null;
    ctx?: FixCtx | null;
  },
  { model = modelFor("fixer") }: { model?: string } = {},
): Promise<unknown> {
  const { file } = stageInfo(stage);
  const raw = await callAI({
    system: SYSTEM,
    user: buildUser({ stage, file, promptText, responseText, verdict, ctx }),
    schema: RESPONSE_SCHEMA,
    schemaName: "prompt_fix",
    temperature: 0.2,
    model,
    costLabel: "aux-suggest-fix",
  });
  return parseAIJson(raw, "Prompt fixer", RESPONSE_SCHEMA.required);
}

export { suggestFix, stageInfo, STAGE_MAP };
