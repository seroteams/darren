import fs from "node:fs";

import { logStage } from "./session.ts";
import { loadAxes, AXIS_IDS, AXIS_MIN, AXIS_MAX } from "./axes.ts";
import { promptFor, getArc, getType } from "./one-on-one-types/index.ts";
import { withPromptVersion } from "./prompt-version.ts";
import { resolveSelectedFocus } from "./selected-focus.ts";
import { splitSystemUser, fillPlaceholders } from "./prompt-utils.ts";
import { loadRoleProfile, renderRoleProfileBlock, roleProfileLogInfo } from "./role-profile.ts";
import { ruleEchoAxisIds } from "./golden-checks.ts";

import { modelFor } from "./models.ts";
import { callAI, parseAIJson } from "./ai-client.ts";

import type { Briefing, AxisRead } from "../shared/briefing.types.ts";
import type { AxisSlot, MeetingContext } from "../shared/session.types.ts";
import { isObjectRecord } from "../shared/guards.ts";

// evaluate is called with EITHER the live AxisState (Record<string, AxisSlot>) or
// the serialized axis state (engine/axes.ts serialize() → just score + history,
// what the CLI eval stage and persisted axis-state.json carry). Both assign to
// this; the post-process only ever reads score + history.
type AxisStateInput = Record<string, Pick<AxisSlot, "score" | "history">> | null | undefined;

const getDefaultModel = () => modelFor("evaluation");

// Disk JSON / model output is unknown until checked — narrow with these instead
// of trusting shapes (the established house pattern).

// The evaluator wire is schema-constrained (RESPONSE_SCHEMA, additionalProperties
// false); confirm the structural minimum (an axes array) and read the parsed
// output as a Briefing. The axis post-process fields (read_status, confidence,
// evidence_basis) are added by applyManagerBriefingPostProcess below.
function isEvalBriefing(v: unknown): v is Briefing {
  return isObjectRecord(v) && Array.isArray(v.axes);
}

// Transcript turns are read defensively: production passes TranscriptEntry[], but
// read-quality also inspects top-level alias/stage some callers stamp on a turn,
// and the fallback reads question.name. Read loosely, exactly as the original did.
interface ReadTurn {
  answer?: string;
  alias?: string | null;
  stage?: string | null;
  skipped?: boolean;
  note?: string;
  turn?: number;
  // The CLI eval stage passes question as the name *string*; the fallback test
  // passes it as a {name} object. buildFallbackBriefing narrows both.
  question?: unknown;
}
type Transcript = ReadonlyArray<ReadTurn> | null | undefined;

type SelectedFocusInput = { id?: string; label?: string };
type AgendaInput = { summary?: string | null; covered?: boolean | null } | null | undefined;
type ScoringInput = { failures?: number; scoredTurns?: number } | null | undefined;
type SessionArg = Parameters<typeof logStage>[0];

const OVERLAP_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "to", "for", "with",
  "is", "are", "was", "were", "be", "been",
]);

const WELLBEING_TRANSCRIPT_EVIDENCE =
  /\b(stress|stressed|burnout|burned out|overwhelmed|anxious|exhausted|can't cope|struggling emotionally)\b/i;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary_bullets: {
      type: "array",
      items: { type: "string" },
    },
    understanding_paragraph: { type: "string" },
    axes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: AXIS_IDS },
          score: { type: "integer" },
          meaning: { type: "string" },
        },
        required: ["id", "score", "meaning"],
        additionalProperties: false,
      },
    },
    brutal_truth_employee: { type: "string" },
    brutal_truth_manager: { type: "string" },
    next_actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          when: {
            type: "string",
            enum: ["today", "this week", "this month", "next 1:1"],
          },
          action: { type: "string" },
        },
        required: ["when", "action"],
        additionalProperties: false,
      },
    },
    watch_for: {
      type: "array",
      items: { type: "string" },
    },
    engagement_read: {
      type: "object",
      properties: {
        level: {
          type: "string",
          enum: ["inconclusive", "no_clear_concern", "worth_checking", "clear_concern"],
        },
        evidence: { type: "array", items: { type: "string" } },
        missing_evidence: { type: "string" },
        recommended_action: { type: "string" },
        watch_next: { type: "string" },
      },
      required: ["level", "evidence", "missing_evidence", "recommended_action", "watch_next"],
      additionalProperties: false,
    },
  },
  required: [
    "headline",
    "summary_bullets",
    "understanding_paragraph",
    "axes",
    "brutal_truth_employee",
    "brutal_truth_manager",
    "next_actions",
    "watch_for",
    "engagement_read",
  ],
  additionalProperties: false,
};

function clampScore(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(AXIS_MIN, Math.min(AXIS_MAX, Math.round(x)));
}

function transcriptText(transcript: Transcript): string {
  return (transcript || [])
    .map((t) => (typeof t === "string" ? t : t?.answer || ""))
    .join("\n");
}

function tokenCount(s: unknown): number {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

// Fixed agenda openers. These are self-read intros, not signal probes — they
// only count toward read-quality when they carry real signal (see below).
const INTRO_ALIASES = new Set([
  "q_open_anything_to_cover",
  "q_intro_agenda_check",
]);

// Tight, multi-word decline / agenda-neutral phrases, matched as normalized
// substrings. Each is distinctive enough not to fire on real signal — never a
// bare "nothing" ("nothing has improved" is a real answer, not a decline).
const DECLINE_PHRASES = [
  "nothing to add",
  "nothing extra",
  "nothing specific",
  "nothing else",
  "nothing on my end",
  "nothing from me",
  "no nothing",
  "okay to start",
  "fine to start",
  "happy to start",
];

// Normalize a note before phrase-matching: lowercase, drop punctuation, collapse
// whitespace. Keeps matching safe and exact-ish rather than broad.
function normalizeAnswer(s: unknown): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDecline(answer: unknown): boolean {
  const norm = normalizeAnswer(answer);
  if (!norm) return false;
  return DECLINE_PHRASES.some((p) => norm.includes(p));
}

// A note can wrap a content-free answer in a reporting verb ("yeah he said
// things have been ok", "says it's fine") and clear the ≤2-token floor while
// carrying no real signal. Strip a leading reporting wrapper, then check whether
// anything concrete is left. Conservative on purpose: it only fires when a
// reporting wrapper was actually present, so a bare note with concrete content
// ("deadlines are tight") is never touched. Kept in sync with the same gate in
// queue-manager.js isShallowAnswer.
const REPORTING_PREFIX =
  /^(yeah|yes|yep|ok|okay)?[\s,]*\b(he|she|they)?\s*(said|says|told me|mentioned|noted|reckons|feels|felt|thinks)\b[\s,]*(that|it)?\s*/i;
// Generic, signal-free words. A remainder built only from these carries nothing.
const LOW_SIGNAL_WORDS = new Set([
  "things", "stuff", "it", "that", "everything", "work", "the", "a",
  "have", "has", "had", "are", "is", "was", "were", "be", "been", "being",
  "feel", "feels", "felt", "seem", "seems", "going",
  "ok", "okay", "fine", "good", "great", "alright", "steady", "same",
  "grand", "really", "just", "pretty", "quite", "bit", "so", "far",
]);

function isLowContentNote(answer: unknown): boolean {
  const norm = normalizeAnswer(answer);
  if (!norm) return false;
  const remainder = norm.replace(REPORTING_PREFIX, "").trim();
  if (!remainder || remainder === norm) return false; // no reporting wrapper — leave to other checks
  const content = remainder.split(/\s+/).filter((w) => w && !LOW_SIGNAL_WORDS.has(w));
  return content.length === 0;
}

// Precompute the read-quality gate the evaluation prompt consumes, so the
// determination does not depend on a weak model reasoning it out at generation
// time. Mirrors <read_quality_gate> in prompts/final-evaluation.md.
//
// The transcript answer field holds the MANAGER's shorthand note of the report's
// reply — third-person, terse, fragment-OK. That is the expected, primary signal,
// NOT a sign of a thin read. A turn carries no signal when it is a skip, an empty
// jot, a ≤2-token non-answer ("fine", "ok"), or a decline ("nothing to add").
//
// Arc-awareness: a self-read / agenda-opener turn is excluded from the tally
// ONLY when it carries no signal — it is an opener, not a probe. If the opener
// holds real signal (a named concern, blocker, workload, risk, growth intent) it
// counts like any substantive turn. Non-intro turns always count.
function computeReadQuality(transcript: Transcript) {
  const turns = (transcript || []).map((t, i) => {
    const answer = typeof t === "string" ? t : t?.answer || "";
    const alias = t?.alias || null;
    const stage = t?.stage || null;
    const skipped = t?.skipped === true;
    const empty = answer.trim().length === 0;
    // A turn the per-turn scorer already flagged `[SHALLOW]` (e.g. an answer too
    // garbled to extract a clear point) is thin, even if it clears the token
    // floor — reconcile read-quality with the scorer instead of disagreeing.
    const noteShallow = typeof t?.note === "string" && t.note.includes("[SHALLOW]");
    const tooShort = tokenCount(answer) <= 2 || isLowContentNote(answer) || noteShallow;
    const decline = isDecline(answer);
    // A skip or empty jot is a *refusal* — the manager captured no note (no
    // data). A two-token answer or a decline is a *thin* note (weak data). Both
    // carry no real signal, but they are different failures: the first must not
    // be framed as "the report answered in 2-4 words".
    let reason: string | null = null;
    if (skipped || empty) reason = "skip";
    else if (decline) reason = "decline";
    else if (tooShort) reason = "thin";
    const shallow = reason !== null;
    const is_note = !shallow;
    const isIntro = stage === "self_read" || (alias != null && INTRO_ALIASES.has(alias));
    const counted = !(isIntro && shallow);
    return { index: i + 1, alias, stage, reason, is_note, shallow, counted };
  });
  const counted = turns.filter((t) => t.counted);
  const total_turns = counted.length;
  const skipped_count = counted.filter((t) => t.reason === "skip").length;
  const thin_count = counted.filter((t) => t.reason === "thin" || t.reason === "decline").length;
  const shallow_count = skipped_count + thin_count;
  const note_turns = counted.filter((t) => t.is_note).length;
  const shallow_ratio = total_turns
    ? Number((shallow_count / total_turns).toFixed(2))
    : 0;
  // Trigger on thin *coverage* (too few real notes), not on raw shallow count —
  // so a few refused questions in an otherwise well-answered session does not
  // flip the briefing into partial-read mode.
  const partial_read =
    note_turns < 3 || (total_turns > 0 && note_turns / total_turns < 0.6);
  let partial_reason: string | null = null;
  if (partial_read) {
    partial_reason = skipped_count >= thin_count ? "mostly_skipped" : "mostly_thin";
  }
  return {
    note_turns,
    total_turns,
    skipped_count,
    thin_count,
    shallow_count,
    shallow_ratio,
    partial_read,
    partial_reason,
    turns,
  };
}

function transcriptShowsLearningCommitment(transcript: Transcript): boolean {
  const joined = transcriptText(transcript).toLowerCase();
  const hasMiss = /\b(missed|wrong|assumption|failed|did not)\b/.test(joined);
  const hasCause = /\b(because|retry|edge case|logic|escalat)\b/.test(joined);
  const hasCommit =
    /\b(will|before handoff|checklist|commit|differently|going to)\b/.test(joined);
  return hasMiss && hasCause && hasCommit;
}

function applyAxisScoresFromState(briefing: Briefing, axisState: AxisStateInput): Briefing {
  if (!briefing?.axes || !axisState) return briefing;
  for (const ax of briefing.axes) {
    const st = axisState[ax.id];
    if (st && typeof st.score === "number") {
      ax.score = clampScore(st.score);
    } else {
      ax.score = clampScore(ax.score);
    }
  }
  return briefing;
}

function applyAxisConfidence(
  briefing: Briefing,
  axisState: AxisStateInput,
  transcript: Transcript
): Briefing {
  if (!briefing?.axes) return briefing;
  const answers = transcriptText(transcript);
  const hasWellbeingEvidence = WELLBEING_TRANSCRIPT_EVIDENCE.test(answers);
  const learning = transcriptShowsLearningCommitment(transcript);

  for (const ax of briefing.axes) {
    const stateScore = axisState?.[ax.id]?.score;
    const history = axisState?.[ax.id]?.history;
    const magnitude = Math.abs(typeof stateScore === "number" ? stateScore : ax.score);

    // Explicit read-status — the backend decides, the UI renders it. An axis is
    // "not_read" when nothing in the meeting moved it (no_history), it landed at a
    // measured zero (zero_score), or it was scored on inference without supporting
    // signal (insufficient_signal). The UI collapses on this, not on a magic 0.
    const noHistory = !Array.isArray(history) || history.length === 0;
    const zeroScore = stateScore === 0;
    let read_status: "read" | "not_read" = "read";
    let not_read_reason: "no_history" | "zero_score" | "insufficient_signal" | undefined;
    if (noHistory) {
      read_status = "not_read";
      not_read_reason = "no_history";
    } else if (zeroScore) {
      read_status = "not_read";
      not_read_reason = "zero_score";
    } else if (ax.id === "wellbeing" && !hasWellbeingEvidence && magnitude <= 1) {
      read_status = "not_read";
      not_read_reason = "insufficient_signal";
    }

    let confidence: "low" | "medium" | "high" = "medium";
    let evidence_basis: "mixed" | "axis_state_only" | "transcript_quotes" | "concentrated_signal" = "mixed";

    if (magnitude <= 1) {
      confidence = "low";
      evidence_basis = "axis_state_only";
    } else if (magnitude >= 5) {
      confidence = "high";
      evidence_basis = "transcript_quotes";
    }

    if (ax.id === "wellbeing" && !hasWellbeingEvidence) {
      confidence = "low";
      evidence_basis = "axis_state_only";
    }

    if (ax.id === "growth" && learning) {
      if (confidence === "low") confidence = "medium";
    }

    // Concentration guard — a high-magnitude score built from ≤2 distinct
    // answer excerpts is one strong signal re-scored across turns, not a
    // session-defining breadth of evidence (the Jun 11 Machar run scored
    // wellbeing -5 off "got a cold"). Cap confidence and name the basis; the
    // prose tier is the prompt's job. Machine-readable fields only — no rewrite.
    if (read_status !== "not_read" && magnitude >= 5) {
      const distinctExcerpts = new Set(
        (Array.isArray(history) ? history : [])
          .map((h) => String(h?.answer_excerpt || "").toLowerCase().replace(/\s+/g, " ").trim())
          .filter(Boolean)
      ).size;
      if (distinctExcerpts <= 2) {
        if (confidence === "high") confidence = "medium";
        evidence_basis = "concentrated_signal";
      }
    }

    if (confidence === "low" && ax.meaning) {
      const harsh =
        /\b(defining signal|ignore at your cost|very weak)\b/i.test(ax.meaning);
      if (harsh) {
        ax.meaning = ax.meaning
          .replace(/\bdefining signal\b/gi, "notable pattern")
          .replace(/\bignore at your cost\b/gi, "worth watching")
          .replace(/\bvery weak\b/gi, "weak");
      }
    }

    // A not_read axis carries no finding — replace any inferred meaning with a
    // plain "didn't come up" caption so it never reads as a verdict.
    if (read_status === "not_read") {
      ax.meaning = "This didn't come up in the conversation — not enough signal to read.";
      confidence = "low";
      evidence_basis = "axis_state_only";
    }

    ax.read_status = read_status;
    if (not_read_reason) ax.not_read_reason = not_read_reason;
    ax.confidence = confidence;
    ax.evidence_basis = evidence_basis;
  }
  return briefing;
}

// Deterministic floor on the engagement read: the model is never trusted to
// name a concern off thin data. If the read was partial, or the engagement and
// wellbeing axes barely registered (combined touches < 2), force
// "inconclusive" regardless of what the model returned. Disengagement is the
// one call where a wrong early label is worse than no label.
function applyEngagementReadGuard(
  briefing: Briefing,
  axisState: AxisStateInput,
  transcript: Transcript
): Briefing {
  const read = briefing?.engagement_read;
  if (!read || typeof read !== "object") return briefing;
  if (read.level === "inconclusive") return briefing;

  const { partial_read } = computeReadQuality(transcript);
  const engagementTouches = axisState?.engagement?.history?.length ?? 0;
  const wellbeingTouches = axisState?.wellbeing?.history?.length ?? 0;
  const thin = engagementTouches + wellbeingTouches < 2;

  if (partial_read || thin) {
    const reason = partial_read ? "partial read" : "engagement/wellbeing barely registered";
    console.warn(
      `[evaluator] engagement_read forced to inconclusive (${reason}; model returned "${read.level}")`
    );
    read.level = "inconclusive";
    read.missing_evidence =
      read.missing_evidence ||
      "The conversation was too thin to read engagement — a fuller next session is needed.";
    // An inconclusive read carries no confident move or tell — strip the
    // sub-fields the model wrote under its (now-overruled) level, so the block
    // collapses to level + missing_evidence instead of duplicating next_actions
    // / watch_for. The renderer skips empty fields.
    read.evidence = [];
    read.recommended_action = "";
    read.watch_next = "";
  }
  return briefing;
}

// When an axis meaning echoes rule-example framing instead of this session's
// words, surface it (drop confidence to low + log) rather than rewrite the
// sentence — engine honesty: flag the problem, don't mask it. `ruleEchoAxisIds`
// is imported from golden-checks; the golden-checks ↔ reviewer import cycle is
// safe because the binding is only used here at call time (ESM live binding),
// never at module load.
function applyMeaningRuleEchoGuard(briefing: Briefing): Briefing {
  if (!briefing?.axes) return briefing;
  const flagged = ruleEchoAxisIds(briefing);
  for (const ax of briefing.axes) {
    if (flagged.has(ax.id)) {
      console.warn(`[evaluator] axis ${ax.id} meaning echoes rule-example framing — confidence forced low`);
      ax.confidence = "low";
    }
  }
  return briefing;
}

function applyManagerBriefingPostProcess(
  briefing: Briefing,
  axisState: AxisStateInput,
  transcript: Transcript
): Briefing {
  let b = briefing;
  b = applyAxisScoresFromState(b, axisState);
  b = applyAxisConfidence(b, axisState, transcript);
  b = applyMeaningRuleEchoGuard(b);
  b = applyEngagementReadGuard(b, axisState, transcript);
  return b;
}

function formatAgendaCarryForward(agenda: AgendaInput): string {
  const summary = agenda?.summary;
  if (!summary) return "(no carry-forward agenda item)";
  const status =
    agenda?.covered === true
      ? "covered"
      : agenda?.covered === false
        ? "NOT covered"
        : "unconfirmed";
  return `The team member opened by asking to cover: "${summary}". By the end the manager marked this ${status}.`;
}

// One-line scoring-health status injected into the evaluation prompt. When the
// per-turn planner failed on one or more turns, axis scores are partial or
// absent — the briefing must lean on the transcript, not on axis movement, and
// lead with low confidence. Mirrors <scoring_status> in final-evaluation.md.
function formatScoringStatus(scoring: ScoringInput): string {
  const failures = Number(scoring?.failures) || 0;
  if (failures <= 0) return "OK — the per-turn scoring engine ran on every turn; axis scores are reliable.";
  const scored = Number(scoring?.scoredTurns) || failures;
  return (
    `DEGRADED — the per-turn scoring engine failed on ${failures} of ${scored} scored turns. ` +
    `Axis scores are partial or absent and must NOT be read as trends. ` +
    `Treat the transcript as raw notes, ground every claim in a quoted note, and lead with low confidence.`
  );
}

interface BuildMessagesArgs {
  ctx: MeetingContext;
  focusPoints?: unknown;
  transcript?: Transcript;
  axisState?: AxisStateInput;
  notes?: string | null;
  selectedFocus?: SelectedFocusInput | null;
  agenda?: AgendaInput;
  scoring?: ScoringInput;
}

function buildMessages({
  ctx,
  focusPoints,
  transcript,
  axisState,
  notes,
  selectedFocus,
  agenda,
  scoring,
}: BuildMessagesArgs) {
  const template = fs.readFileSync(promptFor(ctx.meetingType, "evaluation"), "utf8");
  const axes = loadAxes();
  const arc = getArc(ctx.meetingType);
  const sf =
    selectedFocus ||
    resolveSelectedFocus({
      notes: notes || ctx.notes,
      observedShift: notes || ctx.notes,
      focusPoints: Array.isArray(focusPoints) ? focusPoints : undefined,
    });
  let typeEvalRules = "";
  try {
    typeEvalRules = getType(ctx.meetingType).eval_rules || "";
  } catch {
    typeEvalRules = "";
  }
  const filled = fillPlaceholders(template, {
    AXES_JSON: JSON.stringify(axes, null, 2),
    NAME: ctx.name || "(not provided)",
    ROLE: ctx.role || "(not provided)",
    SENIORITY: ctx.seniority || "(not provided)",
    MEETING_TYPE: ctx.meetingType,
    TYPE_EVAL_RULES: typeEvalRules,
    TONE_REGISTER: arc.tone_register,
    ANTI_PATTERNS_JSON: JSON.stringify(arc.anti_patterns, null, 2),
    MEETING_ARC_JSON: JSON.stringify(arc.arc, null, 2),
    MANAGER_NOTES: notes || "(none)",
    FOCUS_POINTS_JSON: JSON.stringify(focusPoints, null, 2),
    SELECTED_FOCUS_JSON: JSON.stringify(sf || {}, null, 2),
    PRIMARY_FOCUS_ID: sf?.id || "(none)",
    TRANSCRIPT_JSON: JSON.stringify(transcript, null, 2),
    AXIS_STATE_JSON: JSON.stringify(axisState, null, 2),
    READ_QUALITY_JSON: JSON.stringify(computeReadQuality(transcript), null, 2),
    SCORING_STATUS: formatScoringStatus(scoring),
    AGENDA_CARRY_FORWARD: formatAgendaCarryForward(agenda),
    ROLE_PROFILE_BLOCK: renderRoleProfileBlock(
      loadRoleProfile({ role: ctx.role, seniority: ctx.seniority }),
      { slice: "eval", meetingType: ctx.meetingType }
    ),
  });

  return splitSystemUser(filled);
}

async function callOpenAI({
  system,
  user,
  model = getDefaultModel(),
  schemaName,
}: { system: string; user: string; model?: string; schemaName?: string }): Promise<string> {
  return callAI({
    system,
    user,
    schema: RESPONSE_SCHEMA,
    schemaName: schemaName || "final_evaluation",
    temperature: 0.5,
    model,
    costLabel: "05-evaluation",
  });
}

function normalizeContentWords(text: unknown): string[] {
  return String(text || "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !OVERLAP_STOP_WORDS.has(word));
}

function fourGrams(words: string[]): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i <= words.length - 4; i += 1) {
    grams.add(words.slice(i, i + 4).join(" "));
  }
  return grams;
}

function fourGramOverlap(headline: unknown, bullet: unknown): number {
  const headlineWords = normalizeContentWords(headline);
  const bulletWords = normalizeContentWords(bullet);
  if (headlineWords.length < 4 || bulletWords.length < 4) return 0;

  const headlineGrams = fourGrams(headlineWords);
  const bulletGrams = fourGrams(bulletWords);
  let overlap = 0;

  for (const gram of bulletGrams) {
    if (headlineGrams.has(gram)) overlap += 1;
  }
  return overlap;
}

function validateBriefingOverlap(briefing: Briefing): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const headline = briefing?.headline || "";
  const bullets = Array.isArray(briefing?.summary_bullets) ? briefing.summary_bullets : [];

  bullets.forEach((bullet, idx) => {
    const overlap = fourGramOverlap(headline, bullet);
    if (overlap >= 1) {
      issues.push(
        `summary_bullets[${idx}] overlaps headline by ${overlap} four-gram(s)`
      );
    }
  });

  return { passed: issues.length === 0, issues };
}

// Checks that the briefing kept two promises the prompt makes but nothing
// previously verified: (1) a present agenda carry-forward is acknowledged in
// exactly one place; (2) a partial read includes a next_action about
// re-running/extending the conversation. Warn-don't-reject in production
// (mirrors validateBriefingOverlap); the offline test hard-fails on these.
const PARTIAL_READ_RERUN =
  /\b(re-?ask|re-?run|rerun|revisit|extend|another (conversation|session)|follow up)\b/i;

function validateBriefingPromptRules(
  briefing: Briefing,
  { agenda, readQuality }: { agenda?: AgendaInput; readQuality?: { partial_read?: boolean } } = {}
): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  const summary = agenda?.summary;
  if (summary) {
    const agendaWords = new Set(normalizeContentWords(summary));
    const entries = [
      ...(Array.isArray(briefing?.summary_bullets) ? briefing.summary_bullets : []),
      ...(Array.isArray(briefing?.next_actions)
        ? briefing.next_actions.map((a) => a?.action)
        : []),
    ];
    const hits = entries.filter((entry) => {
      const words = normalizeContentWords(entry);
      let shared = 0;
      for (const w of words) if (agendaWords.has(w)) shared += 1;
      return shared >= 2;
    }).length;
    if (hits === 0) {
      issues.push("agenda carry-forward present but not acknowledged in summary_bullets or next_actions");
    } else if (hits > 1) {
      issues.push(`agenda carry-forward acknowledged in ${hits} places (rule says exactly one)`);
    }
  }

  if (readQuality?.partial_read) {
    const actions = Array.isArray(briefing?.next_actions) ? briefing.next_actions : [];
    const hasRerun = actions.some((a) => PARTIAL_READ_RERUN.test(a?.action || ""));
    if (!hasRerun) {
      issues.push("partial_read=true but no next_action addresses re-running the conversation");
    }
  }

  return { passed: issues.length === 0, issues };
}

// Deterministic minimal briefing for when generation fails (next-stage Phase 3).
// Built ONLY from transcript facts + the live axis scores — nothing inferred,
// nothing invented. The headline and paragraph state plainly that the written
// read could not be generated, so the manager is never silently handed a blank
// or a fake. Shaped like a normal briefing so the existing render works.
function buildFallbackBriefing({
  ctx,
  transcript = [],
  axisState,
}: {
  ctx?: { name?: string } | null;
  transcript?: Transcript;
  axisState?: AxisStateInput;
}): Briefing {
  const name = (ctx && ctx.name) || "them";
  const answered = (transcript || []).filter((t) => {
    const a = String(t && t.answer ? t.answer : "").trim();
    return a && a !== "(skipped)";
  });
  const trim = (s: unknown): string => String(s || "").replace(/\s+/g, " ").trim();
  const summary_bullets = answered.slice(0, 6).map((t) => {
    const q = trim(isObjectRecord(t.question) ? t.question.name : undefined) || "Question";
    const a = trim(t.answer);
    const aShort = a.length > 160 ? a.slice(0, 157) + "…" : a;
    return `Asked: ${q} — they said: ${aShort}`;
  });
  if (!summary_bullets.length) {
    summary_bullets.push("No answers were captured in this session.");
  }
  // Real, deterministic per-answer scores; the written read is what failed.
  const axes = axisState
    ? Object.entries(axisState).map(([id, a]): AxisRead => ({
        id,
        score: typeof (a && a.score) === "number" ? a.score : 0,
        meaning: "Live score from the conversation — the written read could not be generated.",
        read_status: a && Array.isArray(a.history) && a.history.length ? "read" : "not_read",
      }))
    : [];
  return {
    generation_failed: true,
    headline: `Briefing generation failed — this is a minimal record of your 1:1 with ${name}, not a written read.`,
    summary_bullets,
    understanding_paragraph:
      "The written briefing could not be generated this time, so the AI summary is unavailable. Below is a factual record of what you asked and what was said, plus the live scores from the conversation. Nothing here is inferred.",
    axes,
    brutal_truth_employee: "",
    brutal_truth_manager: "",
    next_actions: [],
    watch_for: [],
    engagement_read: {
      level: "inconclusive",
      evidence: [],
      missing_evidence: "Briefing generation failed.",
      recommended_action: "",
      watch_next: "",
    },
  };
}

interface EvaluateArgs {
  ctx: MeetingContext;
  focusPoints?: unknown;
  transcript?: Transcript;
  axisState?: AxisStateInput;
  notes?: string | null;
  selectedFocus?: SelectedFocusInput | null;
  agenda?: AgendaInput;
  scoring?: ScoringInput;
}

async function evaluate(
  { ctx, focusPoints, transcript, axisState, notes, selectedFocus, agenda, scoring }: EvaluateArgs,
  { model = getDefaultModel(), session, stage = "05-evaluation" }: { model?: string; session?: SessionArg; stage?: string } = {}
): Promise<Briefing> {
  const sf =
    selectedFocus ||
    resolveSelectedFocus({
      notes: notes || ctx?.notes,
      focusPoints: Array.isArray(focusPoints) ? focusPoints : undefined,
    });
  const msgs = buildMessages({
    ctx,
    focusPoints,
    transcript,
    axisState,
    notes,
    selectedFocus: sf,
    agenda,
    scoring,
  });
  const evalPromptPath = promptFor(ctx.meetingType, "evaluation");
  const logInputs = withPromptVersion(
    {
      ctx,
      focusPoints,
      transcript,
      axisState,
      notes,
      selectedFocus: sf,
      scoring,
      model,
      roleProfile: roleProfileLogInfo({ role: ctx.role, seniority: ctx.seniority }),
    },
    evalPromptPath
  );

  // Deterministic fallback path: if the model call or JSON parse fails, hand the
  // manager an honest minimal briefing (transcript facts + live scores) instead
  // of throwing. Logged with a GENERATION_FAILED flag — never silently masked.
  let raw: string | undefined;
  let briefing: Briefing;
  try {
    raw = await callOpenAI({ ...msgs, model });
    const parsed = parseAIJson(raw, "Evaluator", ["headline", "axes", "next_actions"]);
    if (!isEvalBriefing(parsed)) {
      throw new Error("Evaluator returned a response without an axes array");
    }
    briefing = applyManagerBriefingPostProcess(parsed, axisState, transcript);
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[evaluator] GENERATION_FAILED — returning deterministic fallback briefing: ${errMessage}`);
    briefing = buildFallbackBriefing({ ctx, transcript, axisState });
    const failLog = {
      inputs: logInputs,
      prompt: msgs.filled,
      response: raw || `(generation failed: ${errMessage})`,
      final: briefing,
      flag: "GENERATION_FAILED",
    };
    logStage(session, stage, failLog);
    return briefing;
  }

  logStage(session, stage, {
    inputs: logInputs,
    prompt: msgs.filled,
    response: raw,
    final: briefing,
  });

  const validation = validateBriefingOverlap(briefing);
  if (!validation.passed) {
    console.warn(`[evaluator] briefing overlap check: ${validation.issues.join("; ")}`);
  }

  const ruleCheck = validateBriefingPromptRules(briefing, {
    agenda,
    readQuality: computeReadQuality(transcript),
  });
  if (!ruleCheck.passed) {
    console.warn(`[evaluator] briefing rule check: ${ruleCheck.issues.join("; ")}`);
  }

  return briefing;
}

export {
  evaluate,
  buildFallbackBriefing,
  buildMessages,
  callOpenAI,
  fourGramOverlap,
  applyManagerBriefingPostProcess,
  applyAxisScoresFromState,
  applyEngagementReadGuard,
  clampScore,
  computeReadQuality,
  validateBriefingPromptRules,
};
