import fs from "node:fs";

import { logStage } from "./session.ts";
import { loadAxes, AXIS_IDS } from "./axes.ts";
import { newAlias, saveQuestion, listAllAliases, loadDir } from "./questions.ts";
import { getArc } from "./meeting-arcs.ts";
import { promptFor } from "./one-on-one-types/index.ts";
import { resolveSelectedFocus } from "./selected-focus.ts";
import { loadLexicon } from "./lexicon.ts";
import { findJargon } from "./golden-checks.ts";
import { isRelationalArc } from "./relational-arcs.ts";
import { splitSystemUser } from "./prompt-utils.ts";
import { loadRoleProfile, renderRoleProfileBlock, roleProfileLogInfo } from "./role-profile.ts";

import { modelFor } from "./models.ts";
import { callAI, parseAIJson } from "./ai-client.ts";

import type { Question, QuestionPurpose } from "../shared/question.types.ts";

const getDefaultModel = () => modelFor("bank");

// Disk JSON / model output is unknown until checked — narrow with these instead
// of trusting shapes (the established house pattern).
function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// A prep brief, as far as this stage reads it (its opener/core issue/listen-for
// seed the bank prompt).
interface PrepLike {
  openingQuestion?: string;
  coreIssue?: string;
  listenFor?: string[];
}

const ALLOWED_DELTAS = [3, 1, -1, -3];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          purpose: { type: "string", enum: ["wellbeing", "topic", "competency"] },
          stage: { type: "string" },
          axis_effects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                axis: { type: "string", enum: AXIS_IDS },
                delta: { type: "integer", enum: ALLOWED_DELTAS },
              },
              required: ["axis", "delta"],
              additionalProperties: false,
            },
          },
        },
        required: ["label", "name", "description", "purpose", "stage", "axis_effects"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

function renderPreferTerms(terms: string[] | null | undefined): string {
  if (!terms || !terms.length) return "(none yet)";
  return terms.join(", ");
}

function renderPreferPhrases(phrases: string[] | null | undefined): string {
  if (!phrases || !phrases.length) return "(none yet)";
  return phrases.map((p) => `- "${p}"`).join("\n");
}

function renderAvoidPhrases(
  items: ReadonlyArray<{ phrase: string; reason: string; better_as: string }> | null | undefined
): string {
  if (!items || !items.length) return "(none yet)";
  return items
    .map((it) => {
      const reason = it.reason ? ` — ${it.reason}` : "";
      const better = it.better_as ? ` Better: "${it.better_as}"` : "";
      return `- "${it.phrase}"${reason}${better}`;
    })
    .join("\n");
}

function renderPrepText(value: unknown): string {
  return value && String(value).trim() ? String(value).trim() : "(none)";
}

function renderPrepListenFor(items: unknown): string {
  return Array.isArray(items) && items.length ? JSON.stringify(items, null, 2) : "(none)";
}

// The bank item the model tagged as the prep-anchored opener (or null).
function findPrepOpener(items: Question[] | null | undefined): Question | null {
  return (items || []).find((q) => /prep opener/i.test(q.label || "")) || null;
}

// A warm question is a pre-written opener/intro: the meeting's first arc stage
// (or self_read) AND a seed/semi_set source. The prep opener (source
// "generated") and planner thread-follows are never warm, so they don't get
// counted into the leading warm run.
function warmIntroFilter(meetingType: string): (q: Question | undefined) => boolean {
  const anchorStageId = getArc(meetingType).arc[0]?.id || null;
  const warmStages = new Set(["self_read", anchorStageId].filter(Boolean));
  return (q) =>
    !!q &&
    warmStages.has(q.stage) &&
    (q.source === "seed" || q.source === "semi_set" || /^q_(intro|open)/.test(q.alias || ""));
}

// Place the prep opener right after the leading run of warm intro questions, so
// it's the first SUBSTANTIVE question — not buried behind the fixed intro probes
// or a planner thread-follow. minIndex keeps it from ever being literally first
// during initial assembly (when the warm opener sits at position 0).
function placePrepOpener(
  queue: Question[],
  prepOpener: Question | null | undefined,
  meetingType: string,
  minIndex = 0
): Question[] {
  if (!prepOpener) return queue;
  const isWarm = warmIntroFilter(meetingType);
  const rest = (queue || []).filter((q) => q.alias !== prepOpener.alias);
  let insertAt = 0;
  while (insertAt < rest.length && isWarm(rest[insertAt])) insertAt += 1;
  if (insertAt < minIndex) insertAt = minIndex;
  return [...rest.slice(0, insertAt), prepOpener, ...rest.slice(insertAt)];
}

// Initial queue assembly: intro questions + bank, with the prep opener moved up
// to just after the warm opener. No-op without a prep brief or tagged opener
// (e.g. the seed-bank fallback).
function assembleQueueWithPrepOpener(
  introQueue: Question[] | null | undefined,
  bank: Question[] | null | undefined,
  prep: PrepLike | null | undefined,
  meetingType: string
): Question[] {
  const base = [...(introQueue || []), ...(bank || [])];
  if (!prep?.openingQuestion || !bank?.length || !introQueue?.length) return base;
  const opener = findPrepOpener(bank);
  if (!opener) return base;
  return placePrepOpener(base, opener, meetingType, 1);
}

// Per-turn pin: keep the prep opener as the first substantive question until it
// has been asked. The live planner re-plans the whole queue each turn and will
// otherwise bury or drop it (it doesn't know the opener is special). Re-inserts
// it if the planner dropped it. No-op once it's been asked.
function pinPrepOpenerEarly(
  queue: Question[],
  prepOpener: Question | null | undefined,
  askedAliases: Set<string> | null | undefined,
  meetingType: string
): Question[] {
  if (!prepOpener) return queue;
  if (askedAliases && typeof askedAliases.has === "function" && askedAliases.has(prepOpener.alias)) {
    return queue;
  }
  return placePrepOpener(queue, prepOpener, meetingType, 0);
}

// Same trust rule as catalogueForArc (src/generate.js), one layer down: in a
// relational arc the bank must not contain evaluative questions. Prompt-side
// instruction here; the post-parse filter in generateBank is the hard gate.
function relationalArcRules(meetingType: string): string {
  if (!isRelationalArc(meetingType)) return "";
  return [
    "**Relational-arc rule (machine-enforced):** This meeting type is a relational check-in, not an assessment.",
    'Every question\'s `purpose` MUST be `wellbeing` or `topic` — never `competency`. Do not ask the report to',
    'prove readiness, leadership, or skill ("trust you in that next role", "what are you doing to drive X") —',
    'probe situations, not character. Items with `purpose: "competency"` are dropped before the bank is saved.',
  ].join(" ");
}

interface BankMessagesArgs {
  axes: unknown;
  focusPoints?: unknown;
  name?: string;
  role?: string;
  seniority?: string;
  meetingType: string;
  notes?: string;
  existingQueue?: Question[] | null;
  selectedFocus?: { id?: string; label?: string } | null;
  prep?: PrepLike | null;
}

function buildMessages({
  axes,
  focusPoints,
  name,
  role,
  seniority,
  meetingType,
  notes,
  existingQueue,
  selectedFocus,
  prep,
}: BankMessagesArgs) {
  const template = fs.readFileSync(promptFor(meetingType, "questionBank"), "utf8");
  const arc = getArc(meetingType);
  const sf =
    selectedFocus ||
    resolveSelectedFocus({ notes, focusPoints: Array.isArray(focusPoints) ? focusPoints : undefined });
  const lexicon = loadLexicon({ meetingType, role, seniority });
  const queueSummary = (existingQueue || []).map((q) => ({
    alias: q.alias,
    label: q.label,
    name: q.name,
    description: q.description,
    stage: q.stage ?? null,
    axis_effects: q.axis_effects,
  }));
  const filled = template
    .replaceAll("{{AXES_JSON}}", JSON.stringify(axes, null, 2))
    .replaceAll("{{FOCUS_POINTS_JSON}}", JSON.stringify(focusPoints, null, 2))
    .replaceAll("{{NAME}}", name || "(not provided)")
    .replaceAll("{{ROLE}}", role || "(not provided)")
    .replaceAll("{{SENIORITY}}", seniority || "(not provided)")
    .replaceAll("{{MEETING_TYPE}}", meetingType)
    .replaceAll("{{MANAGER_NOTES}}", notes || "(none)")
    .replaceAll("{{SELECTED_FOCUS_JSON}}", JSON.stringify(sf || {}, null, 2))
    .replaceAll("{{PRIMARY_FOCUS_ID}}", sf?.id || "(none)")
    .replaceAll("{{EXISTING_QUEUE_JSON}}", JSON.stringify(queueSummary, null, 2))
    .replaceAll("{{MEETING_ARC_JSON}}", JSON.stringify(arc.arc, null, 2))
    .replaceAll("{{TONE_REGISTER}}", arc.tone_register)
    .replaceAll("{{RELATIONAL_ARC_RULES}}", relationalArcRules(meetingType))
    .replaceAll("{{ANTI_PATTERNS_JSON}}", JSON.stringify(arc.anti_patterns, null, 2))
    .replaceAll("{{CONVERSATION_PREFER_TERMS}}", renderPreferTerms(lexicon.preferTerms))
    .replaceAll("{{CONVERSATION_PREFER_PHRASES}}", renderPreferPhrases(lexicon.preferPhrases))
    .replaceAll("{{CONVERSATION_AVOID_PHRASES}}", renderAvoidPhrases(lexicon.avoidPhrases))
    .replaceAll("{{PREP_OPENING_QUESTION}}", renderPrepText(prep?.openingQuestion))
    .replaceAll("{{PREP_CORE_ISSUE}}", renderPrepText(prep?.coreIssue))
    .replaceAll("{{PREP_LISTEN_FOR_JSON}}", renderPrepListenFor(prep?.listenFor))
    .replaceAll(
      "{{ROLE_PROFILE_BLOCK}}",
      renderRoleProfileBlock(loadRoleProfile({ role, seniority }), { slice: "full", meetingType })
    );

  return splitSystemUser(filled);
}

async function callOpenAI({ system, user, model = getDefaultModel() }: { system: string; user: string; model?: string }): Promise<string> {
  return callAI({
    system,
    user,
    schema: RESPONSE_SCHEMA,
    schemaName: "question_bank",
    temperature: 0.7,
    model,
    costLabel: "03-question-bank",
  });
}

function snapToAllowedDelta(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return ALLOWED_DELTAS.reduce((best, d) => (Math.abs(d - n) < Math.abs(best - n) ? d : best));
}

function toAxisObject(effects: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of Array.isArray(effects) ? effects : []) {
    if (isObjectRecord(e) && typeof e.axis === "string" && AXIS_IDS.includes(e.axis)) {
      out[e.axis] = snapToAllowedDelta(e.delta);
    }
  }
  return out;
}

interface GenerateBankArgs {
  focusPoints?: unknown;
  name?: string;
  role?: string;
  seniority?: string;
  meetingType: string;
  notes?: string;
  existingQueue?: Question[] | null;
  selectedFocus?: { id?: string; label?: string } | null;
  primaryFocusId?: string;
  prep?: PrepLike | null;
}

type BankOpts = { model?: string; session?: Parameters<typeof logStage>[0]; stage?: string };

async function generateBank(
  {
    focusPoints,
    name,
    role,
    seniority,
    meetingType,
    notes,
    existingQueue,
    selectedFocus,
    primaryFocusId,
    prep,
  }: GenerateBankArgs,
  { model = getDefaultModel(), session, stage = "03-question-bank" }: BankOpts = {}
): Promise<Question[]> {
  const axes = loadAxes();
  const sf =
    selectedFocus ||
    resolveSelectedFocus({ notes, focusPoints: Array.isArray(focusPoints) ? focusPoints : undefined, primaryFocusId });
  const messages = buildMessages({
    axes,
    focusPoints,
    name,
    role,
    seniority,
    meetingType,
    notes,
    existingQueue,
    selectedFocus: sf,
    prep,
  });
  const raw = await callOpenAI({ ...messages, model });
  const parsed = asRecord(parseAIJson(raw, "Question generator", ["questions"]));

  const existing = listAllAliases();
  const saved: Question[] = [];
  const droppedJargon: Array<{ label: string; name: string; term: string }> = [];
  const droppedCompetencyForArc: Array<{ label: string; name: string }> = [];
  const relational = isRelationalArc(meetingType);
  for (const item of Array.isArray(parsed.questions) ? parsed.questions : []) {
    const q = asRecord(item);
    const name_ = asString(q.name);
    const description = asString(q.description);
    const label = asString(q.label);
    // Plain-language backstop — drop (never rewrite) a generated question that
    // uses banned jargon; the prompt's plain-speech lint does the main work.
    const jargon = findJargon(`${name_} ${description}`);
    if (jargon) {
      droppedJargon.push({ label, name: name_, term: jargon });
      continue;
    }
    const purposeRaw = asString(q.purpose);
    // Relational-arc gate — drop (never relabel) competency questions for
    // Bi-weekly / Something-feels-off. Mirrors catalogueForArc on focus points:
    // the model can't ship what we don't keep.
    if (relational && purposeRaw === "competency") {
      droppedCompetencyForArc.push({ label, name: name_ });
      continue;
    }
    const alias = newAlias(label, existing);
    existing.add(alias);
    const purpose: QuestionPurpose =
      purposeRaw === "wellbeing" || purposeRaw === "topic" || purposeRaw === "competency" || purposeRaw === "engagement"
        ? purposeRaw
        : "topic";
    const obj: Question = {
      alias,
      label,
      name: name_,
      description,
      purpose,
      stage: asString(q.stage) || null,
      axis_effects: toAxisObject(q.axis_effects),
      source: "generated",
    };
    saveQuestion(obj);
    saved.push(obj);
  }

  logStage(session, stage, {
    inputs: { focusPoints, name, role, seniority, meetingType, notes, model, roleProfile: roleProfileLogInfo({ role, seniority }) },
    prompt: messages.filled,
    response: {
      raw,
      saved_aliases: saved.map((q) => q.alias),
      ...(droppedJargon.length ? { dropped_jargon: droppedJargon } : {}),
      ...(droppedCompetencyForArc.length
        ? { dropped_competency_for_arc: droppedCompetencyForArc }
        : {}),
    },
  });

  return saved;
}

// Seed YAML are canonical saved questions (saveQuestion writes exactly the 8
// Question fields). Materialise each into a typed Question — note axis_effects is
// already a stored {axisId: delta} object here, NOT the planner's wire array, so
// it is read as-is (not via toAxisObject).
function seedToQuestion(item: unknown): Question {
  const r = asRecord(item);
  const purposeRaw = asString(r.purpose);
  const purpose: QuestionPurpose =
    purposeRaw === "wellbeing" || purposeRaw === "topic" || purposeRaw === "competency" || purposeRaw === "engagement"
      ? purposeRaw
      : "topic";
  const axis_effects: Record<string, number> = {};
  if (isObjectRecord(r.axis_effects)) {
    for (const [axis, delta] of Object.entries(r.axis_effects)) {
      if (typeof delta === "number") axis_effects[axis] = delta;
    }
  }
  return {
    alias: asString(r.alias),
    label: asString(r.label),
    name: asString(r.name),
    description: asString(r.description),
    purpose,
    stage: asString(r.stage) || null,
    axis_effects,
    source: asString(r.source) || "seed",
  };
}

async function generateBankWithFallback(
  args: GenerateBankArgs,
  opts?: BankOpts,
  { onFallback }: { onFallback?: (e: unknown) => void } = {}
): Promise<Question[]> {
  try {
    return await generateBank(args, opts);
  } catch (e) {
    onFallback?.(e);
    return loadDir("_seed").map(seedToQuestion);
  }
}

export {
  generateBank,
  generateBankWithFallback,
  buildMessages,
  callOpenAI,
  assembleQueueWithPrepOpener,
  findPrepOpener,
  pinPrepOpenerEarly,
  seedToQuestion,
};
