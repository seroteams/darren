// The ONE AI moment of a Monthly Check-in (monthly-checkin Phase 5). At the end of a guided
// session it drafts the Summary (headline + bullets, read by both sides) and the manager-PRIVATE
// suggestion buckets, from THIS session's inputs + the PREVIOUS check-in. Mirrors the engine's
// single-shot structured-call machinery (see preparation.ts). Engine honesty is a hard rule: the
// raw model output is surfaced as-is; a call/parse failure returns an explicit "couldn't draft
// this" — NEVER a hardcoded rewrite that hides the failure.

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { logStage } from "../session.ts";
import { modelFor } from "../models.ts";
import { callAI, parseAIJson } from "../ai-client.ts";
import { withPromptVersion } from "../prompt-version.ts";
import { splitSystemUser, fillPlaceholders } from "../prompt-utils.ts";
import { PROMPTS_DIR } from "../paths.mts";
import { asRecord, asString } from "../../shared/guards.ts";

/** What the service assembles and hands the engine — serialised verbatim into the prompt. */
export interface GuidedWrapupInput {
  personName: string;
  thisSession: Record<string, unknown>;
  previous: Record<string, unknown> | null;
}

export interface GuidedWrapupResult {
  summary: { headline: string; bullets: string[] } | null;
  suggestions: { individual: string[]; team: string[]; company: string[] } | null;
  /** Set (with summary/suggestions null) when the model call or parse failed — surfaced, not hidden. */
  error?: string;
  runId: string;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        headline: { type: "string" },
        bullets: { type: "array", items: { type: "string" }, maxItems: 6 },
      },
      required: ["headline", "bullets"],
      additionalProperties: false,
    },
    suggestions: {
      type: "object",
      properties: {
        individual: { type: "array", items: { type: "string" }, maxItems: 3 },
        team: { type: "array", items: { type: "string" }, maxItems: 3 },
        company: { type: "array", items: { type: "string" }, maxItems: 3 },
      },
      required: ["individual", "team", "company"],
      additionalProperties: false,
    },
  },
  required: ["summary", "suggestions"],
  additionalProperties: false,
};

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(asString).filter((s) => s.trim().length > 0) : [];

function coerce(v: unknown): { summary: GuidedWrapupResult["summary"]; suggestions: GuidedWrapupResult["suggestions"] } {
  const r = asRecord(v);
  const s = asRecord(r.summary);
  const sug = asRecord(r.suggestions);
  return {
    summary: { headline: asString(s.headline), bullets: strArray(s.bullets) },
    suggestions: {
      individual: strArray(sug.individual),
      team: strArray(sug.team),
      company: strArray(sug.company),
    },
  };
}

export async function generateGuidedWrapup(
  input: GuidedWrapupInput,
  { model = modelFor("guided_wrapup"), session }: { model?: string; session?: Parameters<typeof logStage>[0] } = {},
): Promise<GuidedWrapupResult> {
  const runId = randomUUID();
  const promptPath = path.join(PROMPTS_DIR, "guided-wrapup.md");
  const template = fs.readFileSync(promptPath, "utf8");
  const filled = fillPlaceholders(template, {
    NAME: input.personName || "(the person)",
    THIS_SESSION_JSON: JSON.stringify(input.thisSession ?? {}, null, 2),
    PREVIOUS_SESSION_JSON: input.previous
      ? JSON.stringify(input.previous, null, 2)
      : "(no previous check-in — this is the first for this person)",
  });
  const messages = splitSystemUser(filled);

  let raw: string;
  try {
    raw = await callAI({
      system: messages.system,
      user: messages.user,
      schema: RESPONSE_SCHEMA,
      schemaName: "guided_wrapup",
      temperature: 0.5,
      model,
      costLabel: "g-wrapup",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logStage(session, "g-wrapup", {
      inputs: withPromptVersion({ ...input, model, runId, error: message }, promptPath),
      prompt: messages.filled,
      response: `ERROR: ${message}`,
    });
    return { summary: null, suggestions: null, error: "couldn't draft this", runId };
  }

  try {
    const parsed = parseAIJson(raw, "Guided wrapup", ["summary", "suggestions"]);
    const result = coerce(parsed);
    logStage(session, "g-wrapup", {
      inputs: withPromptVersion({ ...input, model, runId }, promptPath),
      prompt: messages.filled,
      response: raw,
    });
    return { ...result, runId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logStage(session, "g-wrapup", {
      inputs: withPromptVersion({ ...input, model, runId, parseError: message }, promptPath),
      prompt: messages.filled,
      response: raw,
    });
    return { summary: null, suggestions: null, error: "couldn't draft this", runId };
  }
}
