// Product-QA evaluation. A self-diagnostic pass over a finished session that
// flags pipeline defects (planner/runtime/eval/prep). Separate from the
// manager-briefing evaluator in reviewer.js — it shares no logic with it, only
// the same external building blocks (prompt loading, the AI client, logging).

import fs from "node:fs";

import { logStage } from "./session.ts";
import { promptFor } from "./one-on-one-types/index.ts";
import { resolveSelectedFocus } from "./selected-focus.ts";
import { splitSystemUser } from "./prompt-utils.ts";
import { withPromptVersion } from "./prompt-version.ts";
import { modelFor } from "./models.ts";
import { callAI, parseAIJson } from "./ai-client.ts";

// Reuse the focus-points shape resolveSelectedFocus already declares (its type
// is not exported, so extract it structurally rather than re-declaring).
type FocusPoints = NonNullable<Parameters<typeof resolveSelectedFocus>[0]>["focusPoints"];

interface ProductQaInput {
  ctx: { name?: string; meetingType: string };
  focusPoints?: FocusPoints;
  transcript?: unknown;
  axisState?: unknown;
  notes?: string;
  selectedFocus?: unknown;
  productQaNotes?: string;
  systemDiagnostics?: unknown;
}

const getDefaultModel = (): string => modelFor("evaluation");

function buildProductQaMessages({
  ctx,
  focusPoints,
  transcript,
  axisState,
  notes,
  selectedFocus,
  productQaNotes,
  systemDiagnostics,
}: ProductQaInput) {
  const qaPath = promptFor(ctx.meetingType, "productQa");
  const template = fs.readFileSync(qaPath, "utf8");
  const sf =
    selectedFocus ||
    resolveSelectedFocus({ notes, focusPoints });
  const filled = template
    .replaceAll("{{NAME}}", ctx.name || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", ctx.meetingType)
    .replaceAll("{{MANAGER_NOTES}}", notes || "(none)")
    .replaceAll("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints, null, 2))
    .replaceAll("{{SELECTED_FOCUS_JSON}}", JSON.stringify(sf || {}, null, 2))
    .replaceAll("{{TRANSCRIPT_JSON}}", JSON.stringify(transcript, null, 2))
    .replaceAll("{{AXIS_STATE_JSON}}", JSON.stringify(axisState, null, 2))
    .replaceAll("{{PRODUCT_QA_NOTES}}", productQaNotes || "(none)")
    .replaceAll(
      "{{SYSTEM_DIAGNOSTICS_JSON}}",
      JSON.stringify(systemDiagnostics || [], null, 2)
    );

  return splitSystemUser(filled);
}

async function evaluateProductQa(
  {
    ctx,
    focusPoints,
    transcript,
    axisState,
    notes,
    selectedFocus,
    productQaNotes,
    systemDiagnostics,
  }: ProductQaInput,
  {
    model = getDefaultModel(),
    session,
    stage = "05-product-qa",
  }: { model?: string; session?: Parameters<typeof logStage>[0]; stage?: string } = {}
): Promise<unknown> {
  const msgs = buildProductQaMessages({
    ctx,
    focusPoints,
    transcript,
    axisState,
    notes,
    selectedFocus,
    productQaNotes,
    systemDiagnostics,
  });
  const qaPath = promptFor(ctx.meetingType, "productQa");
  const raw = await callAI({
    system: msgs.system,
    user: msgs.user,
    schema: {
      type: "object",
      properties: {
        defects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              turn: { type: "integer" },
              alias: { type: "string" },
              symptom: { type: "string" },
              likely_cause: {
                type: "string",
                enum: ["planner", "runtime", "eval", "prep"],
              },
            },
            required: ["symptom", "likely_cause"],
            additionalProperties: false,
          },
        },
        summary: { type: "string" },
      },
      required: ["defects", "summary"],
      additionalProperties: false,
    },
    schemaName: "product_qa_report",
    temperature: 0.3,
    model,
    costLabel: stage,
  });

  logStage(session, stage, {
    inputs: withPromptVersion(
      { ctx, productQaNotes, systemDiagnostics, model },
      qaPath
    ),
    prompt: msgs.filled,
    response: raw,
  });

  return parseAIJson(raw, "Product QA", ["defects", "summary"]);
}

export { evaluateProductQa, buildProductQaMessages };
