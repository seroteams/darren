// Deterministic trust checks for the regression gate.
//
// These are CODE rules, not model judgment — they decide the gate's hard
// pass/fail. The LLM judge (scripts/eval-judge.js) only adds advisory warnings
// on top; it never sets a hard verdict here.
//
// Reach is deliberately honest (see evals/README.md "Known limitations"):
//   - PRIVATE_NOTE_LEAK is a blatant-case tripwire (near-verbatim reuse only).
//   - OVERDIAGNOSIS_ON_THIN tests the engine's softening guardrail, not every
//     prose-level over-read.
// The reworded/subtle cases fall to the judge Warn and, later, the data-flow
// boundary fast-follow.

import { computeReadQuality } from "../backend/engine/reviewer.ts";
import { forbiddenPatternsFor, isDuplicateText } from "../backend/engine/question-eligibility.ts";
import {
  runManagerBriefingBans,
  runCrossSessionLeakCheck,
  runQuestionGroundingChecks,
  runFocusArcGate,
  runQuestionArcGate,
  runAxisSilenceCheck,
  runMeaningRuleEchoCheck,
  runRoleProfileArcGate,
  runRoleProfileVocabLeak,
  runEvalIntegrityChecks,
} from "../backend/engine/golden-checks.ts";
import { loadRoleProfile } from "../backend/engine/role-profile.ts";
import { getArc } from "../backend/engine/one-on-one-types/index.ts";
import type { Briefing } from "../backend/shared/briefing.types.ts";

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}
function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
// Same pragmatic narrowing the engine uses (golden-checks.isBriefingShape): the
// eval wire is schema-constrained, so an axes array is the structural minimum.
function isBriefingShape(v: unknown): v is Briefing {
  return isObjectRecord(v) && Array.isArray(v.axes);
}

// A loose, all-optional turn — a superset of the engine's GateTurn and ReadTurn,
// so a materialised transcript is assignable to both the gate functions and
// computeReadQuality while still exposing the extra fields trust-checks reads.
interface LooseQuestion {
  name?: string;
  alias?: string;
  label?: string;
  description?: string;
  purpose?: string;
  grounding?: string;
  source?: string;
  stage?: string | null;
}
interface LooseTurn {
  turn?: number;
  answer?: string;
  skipped?: boolean;
  alias?: string;
  note?: string;
  question?: LooseQuestion;
}

function toLooseQuestion(v: unknown): LooseQuestion {
  const r = asRecord(v);
  const out: LooseQuestion = {};
  if (typeof r.name === "string") out.name = r.name;
  if (typeof r.alias === "string") out.alias = r.alias;
  if (typeof r.label === "string") out.label = r.label;
  if (typeof r.description === "string") out.description = r.description;
  if (typeof r.purpose === "string") out.purpose = r.purpose;
  if (typeof r.grounding === "string") out.grounding = r.grounding;
  if (typeof r.source === "string") out.source = r.source;
  if (typeof r.stage === "string" || r.stage === null) out.stage = r.stage;
  return out;
}
function toLooseTranscript(v: unknown): LooseTurn[] {
  if (!Array.isArray(v)) return [];
  return v.map((t) => {
    const r = asRecord(t);
    const out: LooseTurn = {};
    if (typeof r.turn === "number") out.turn = r.turn;
    if (typeof r.answer === "string") out.answer = r.answer;
    if (typeof r.skipped === "boolean") out.skipped = r.skipped;
    if (typeof r.alias === "string") out.alias = r.alias;
    // computeReadQuality reads the per-turn `note` to detect [SHALLOW]-flagged
    // answers; it MUST survive materialisation or the OVERDIAGNOSIS_ON_THIN gate
    // silently goes dark on substantive-but-thin reads.
    if (typeof r.note === "string") out.note = r.note;
    if (r.question !== undefined) out.question = toLooseQuestion(r.question);
    return out;
  });
}

const HARD_FAIL = {
  PRIVATE_NOTE_LEAK: "PRIVATE_NOTE_LEAK",
  OVERDIAGNOSIS_ON_THIN: "OVERDIAGNOSIS_ON_THIN",
  WRONG_MEETING_TYPE: "WRONG_MEETING_TYPE",
  ENGINE_VOCAB_LEAK: "ENGINE_VOCAB_LEAK",
  FOCUS_ARC_LEAK: "FOCUS_ARC_LEAK",
  QUESTION_ARC_LEAK: "QUESTION_ARC_LEAK",
  ROLE_PROFILE_ARC_LEAK: "ROLE_PROFILE_ARC_LEAK",
  ROLE_PROFILE_VOCAB_LEAK: "ROLE_PROFILE_VOCAB_LEAK",
  SCHEMA_INVALID: "SCHEMA_INVALID",
  QUESTION_INTEGRITY: "QUESTION_INTEGRITY",
  CROSS_SESSION_QUESTION_LEAK: "CROSS_SESSION_QUESTION_LEAK",
  INFERRED_STATE_LEAK: "INFERRED_STATE_LEAK",
  THIN_INPUT_SUPPRESSION: "THIN_INPUT_SUPPRESSION",
  EVIDENCE_ANCHOR: "EVIDENCE_ANCHOR",
};

const REQUIRED_BRIEFING_KEYS = [
  "headline",
  "summary_bullets",
  "understanding_paragraph",
  "axes",
  "brutal_truth_employee",
  "brutal_truth_manager",
  "next_actions",
  "watch_for",
];

// Manager fields the employee never sees. Everything else in the briefing is
// employee-facing / shareable, so a private worry reaching any of those is a
// leak. brutal_truth_manager is the manager-only channel and is exempt.
const MANAGER_ONLY_FIELDS = new Set(["brutal_truth_manager"]);

// Words that flag a clause as the manager's private *judgment* (not a neutral
// observation). The leak check only fires when a judgment clause is reused — so
// a note like "just joined, shipped payments refactor" (pure observation) never
// trips it, but "I doubt he's ready to lead" does.
const JUDGMENT_MARKERS = [
  "doubt", "not sure", "unsure", "worried", "worry", "concern", "concerned",
  "readiness", "ready", "confidence", "confident", "insecure", "hesitant",
  "coasting", "checked out", "struggling", "weak", "lacking", "immature",
  "maturity", "not management material", "interviewing", "disengaged",
];
const MARKER_RE = new RegExp(
  `\\b(${JUDGMENT_MARKERS.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i"
);

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "to", "for", "with",
  "is", "are", "was", "were", "be", "been", "has", "have", "had", "his", "her", "their", "they",
  "he", "she", "it", "i", "im", "ive", "that", "this", "about", "into", "at",
  "as", "by", "from", "still", "often", "but", "not",
]);

function contentWords(text: unknown): string[] {
  return asString(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOP_WORDS.has(w));
}

function ngramSet(words: string[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i <= words.length - n; i += 1) {
    out.add(words.slice(i, i + n).join(" "));
  }
  return out;
}

// Concatenate every employee-facing briefing field (excludes brutal_truth_manager).
function employeeFacingText(briefing: unknown): string {
  if (!isObjectRecord(briefing)) return "";
  const parts: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") parts.push(v);
  };
  for (const [key, value] of Object.entries(briefing)) {
    if (MANAGER_ONLY_FIELDS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") push(item);
        else if (item && typeof item === "object") {
          push(asRecord(item).action);
          push(asRecord(item).meaning);
        }
      }
    } else {
      push(value);
    }
  }
  return parts.join("\n");
}

// ── No-inference ruling gates (docs/sero-prompt-improvement-spec.md §4) ─────
// Same honest-reach philosophy as the rest of this file: blatant tripwires over
// clever heuristics. Reworded/subtle state reads fall to the judge Warn.

// Assertions of an internal employee state. Each entry is a word family so the
// anchor check can match morphology ("disengaged" anchors "disengagement").
const STATE_ASSERTIONS: Array<{ label: string; re: RegExp }> = [
  { label: "disengagement", re: /\bdisengag\w*\b/i },
  { label: "burnout", re: /\bburn(?:ed|t|ing)[\s-]?out\b|\bburnout\b/i },
  { label: "checked out", re: /\bcheck(?:ed|ing)[\s-]?out\b/i },
  { label: "quiet quitting", re: /\bquiet[\s-]?quit\w*\b/i },
  { label: "flight risk", re: /\bflight[\s-]?risk\b/i },
  { label: "unreliable", re: /\bunreliab\w*\b/i },
  { label: "feedback avoidance", re: /\bavoid\w*\s+feedback\b|\bfeedback[\s-]?avoid\w*\b/i },
  { label: "low ownership", re: /\b(?:low|lacks?|lacking|no)\s+ownership\b/i },
  { label: "poor judgment", re: /\bpoor\s+judge?ment\b/i },
  { label: "demotivated", re: /\bdemotivat\w*\b|\bunmotivat\w*\b|\b(?:losing|lost)\s+(?:\w+\s+)?motivation\b/i },
  { label: "coasting", re: /\bcoasting\b/i },
  { label: "quitting risk", re: /\b(?:about|going|planning)\s+to\s+quit\b|\blooking\s+to\s+leave\b|\bone\s+foot\s+out\b/i },
];

// Manager-facing prose: the manager-only truth channel plus engagement_read's
// free-text fields. `engagement_read.level` is deliberately NOT scanned — its
// enum tokens ("worth_checking", "clear_concern") are the legacy state labels,
// carved out 2026-07-05 so this gate doesn't red-line the current contract.
// The Phase 3 re-spec of engagement_read removes this carve-out
// (docs/todo/no-inference-ruling/phase-3.md).
function managerFacingText(briefing: unknown): string {
  const b = asRecord(briefing);
  const parts: string[] = [asString(b.brutal_truth_manager)];
  const er = asRecord(b.engagement_read);
  for (const [key, value] of Object.entries(er)) {
    if (key === "level") continue; // carve-out (see above)
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) parts.push(...value.filter((v): v is string => typeof v === "string"));
  }
  return parts.filter(Boolean).join("\n");
}

function transcriptAnswerText(transcript: LooseTurn[]): string {
  return (transcript || []).map((t) => asString(t.answer)).filter(Boolean).join("\n");
}

// INFERRED_STATE_LEAK — no output may assert an internal employee state the
// input doesn't carry. Surface rule (2026-07-05 review): a state word the
// manager typed may appear in MANAGER-facing prose only; employee-facing text
// may never carry one unless the employee said it themselves in the session
// (self-authored text is the validated basis — spec §1).
function checkInferredStateLeak(managerNotes: unknown, transcript: LooseTurn[], briefing: unknown): string[] {
  const failures: string[] = [];
  const notes = asString(managerNotes);
  const answers = transcriptAnswerText(transcript);
  const empText = employeeFacingText(briefing);
  const mgrText = managerFacingText(briefing);
  for (const s of STATE_ASSERTIONS) {
    if (empText && s.re.test(empText) && !s.re.test(answers)) {
      failures.push(`state assertion "${s.label}" in employee-facing output (allowed only when the employee said it themselves)`);
    }
    if (mgrText && s.re.test(mgrText) && !s.re.test(notes) && !s.re.test(answers)) {
      failures.push(`state assertion "${s.label}" in manager-facing output with no anchor in the manager's notes or the transcript`);
    }
  }
  return failures;
}

// THIN_INPUT_SUPPRESSION — manager free-text under 15 tokens (the session's
// total pre-meeting notes, counted once) cannot support a state read of ANY
// polarity, even one the note itself asserts; only the employee's own words
// in the session can carry it. Near-empty notes (<3 content words) also may
// not produce "signal" focus points — the focus prompt's sparse-notes branch.
// NOTE: the 15-token floor deliberately does NOT suppress signal points on
// short-but-concrete notes (a 14-token "she's been quieter in team
// conversations" is a real observable — see frozen cases rachel-singh /
// sofia-martinez); those are held to EVIDENCE_ANCHOR instead.
const THIN_NOTES_TOKENS = 15;
function checkThinInputSuppression(managerNotes: unknown, transcript: LooseTurn[], briefing: unknown, focusPoints: unknown): string[] {
  const notes = asString(managerNotes).trim();
  const tokenCount = notes ? notes.split(/\s+/).length : 0;
  if (tokenCount >= THIN_NOTES_TOKENS) return [];
  const failures: string[] = [];
  const answers = transcriptAnswerText(transcript);
  const outputText = `${employeeFacingText(briefing)}\n${managerFacingText(briefing)}`;
  for (const s of STATE_ASSERTIONS) {
    if (s.re.test(outputText) && !s.re.test(answers)) {
      failures.push(`state claim "${s.label}" on thin manager notes (${tokenCount} tokens < ${THIN_NOTES_TOKENS}) with no transcript anchor`);
    }
  }
  if (contentWords(notes).length < 3) {
    const points: unknown[] = Array.isArray(focusPoints) ? focusPoints : [];
    for (const p of points) {
      const fp = asRecord(p);
      if (asString(fp.source) === "signal") {
        failures.push(`"signal" focus point "${asString(fp.id) || asString(fp.label)}" on near-empty notes — sparse notes must produce best_practice points only`);
      }
    }
  }
  return failures;
}

// EVIDENCE_ANCHOR — every "signal" focus point must trace to the manager's
// notes: at least 2 shared content-word stems, or 1 shared stem of a long
// (6+ char) word — light stemming so "quieter" anchors "quietness".
// best_practice points are anchored by the catalogue instead; a point with no
// source tag at all fails (the source field is the contract, not a nicety).
const STEM_LEN = 5;
function stemOf(word: string): string {
  return word.length > STEM_LEN ? word.slice(0, STEM_LEN) : word;
}
function checkEvidenceAnchor(managerNotes: unknown, focusPoints: unknown): string[] {
  const failures: string[] = [];
  const noteStemLens = new Map<string, number>();
  for (const w of contentWords(managerNotes)) {
    const s = stemOf(w);
    noteStemLens.set(s, Math.max(noteStemLens.get(s) || 0, w.length));
  }
  const points: unknown[] = Array.isArray(focusPoints) ? focusPoints : [];
  for (const p of points) {
    const fp = asRecord(p);
    const source = asString(fp.source);
    const name = asString(fp.id) || asString(fp.label) || "unnamed";
    if (source === "best_practice") continue;
    if (source !== "signal") {
      failures.push(`focus point "${name}" has no source tag — every point must declare signal|best_practice`);
      continue;
    }
    const shared = new Set<string>();
    let longAnchor = false;
    for (const w of contentWords(`${asString(fp.label)} ${asString(fp.reason)}`)) {
      const s = stemOf(w);
      const noteLen = noteStemLens.get(s);
      if (noteLen === undefined) continue;
      shared.add(s);
      if (w.length >= 6 || noteLen >= 6) longAnchor = true;
    }
    if (shared.size < 2 && !longAnchor) {
      failures.push(`"signal" focus point "${name}" shares no content with the manager's notes — cite the note or tag it best_practice`);
    }
  }
  return failures;
}

// PRIVATE_NOTE_LEAK — blatant tripwire. Splits the manager notes into clauses,
// keeps the ones that read as private judgment, and flags if any reuses a run of
// 3 content words verbatim in the employee-facing output. Will miss rewordings
// (those are the judge's job).
function checkPrivateNoteLeak(managerNotes: unknown, briefing: unknown) {
  const employeeText = employeeFacingText(briefing);
  if (!managerNotes || !employeeText) return null;

  // Bigram of content words: catches near-verbatim reuse of a 2-word judgment
  // span (e.g. "ready to lead" → content words "ready lead") that a trigram
  // misses once stopwords collapse it. Marker-gating below keeps false
  // positives down — only judgment clauses are compared.
  const employeeGrams = ngramSet(contentWords(employeeText), 2);
  if (!employeeGrams.size) return null;

  const clauses = asString(managerNotes)
    .split(/[.;\n!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((c) => MARKER_RE.test(c));

  for (const clause of clauses) {
    const grams = ngramSet(contentWords(clause), 2);
    for (const g of grams) {
      if (employeeGrams.has(g)) {
        return { reason: HARD_FAIL.PRIVATE_NOTE_LEAK, detail: `private judgment reused in employee-facing output: "${g}"` };
      }
    }
  }
  return null;
}

// OVERDIAGNOSIS_ON_THIN — when the read is thin (mostly skipped/declined), the
// engine is supposed to soften: axes go not_read, meanings hedge. This fails if
// a thin transcript still produced a confident, high-magnitude axis read — i.e.
// the softening guardrail regressed.
function checkOverdiagnosisOnThin(transcript: LooseTurn[], briefing: unknown) {
  const rq = computeReadQuality(transcript || []);
  if (!rq.partial_read) return { result: null, rq };
  const axesRaw = asRecord(briefing).axes;
  const axes: unknown[] = Array.isArray(axesRaw) ? axesRaw : [];
  for (const axRaw of axes) {
    const ax = asRecord(axRaw);
    const confident = ax.read_status === "read" && ax.confidence === "high";
    const strong = ax.read_status !== "not_read" && Math.abs(Number(ax.score) || 0) >= 5;
    if (confident || strong) {
      return {
        result: {
          reason: HARD_FAIL.OVERDIAGNOSIS_ON_THIN,
          detail: `partial read (${rq.note_turns}/${rq.total_turns} real notes) but axis "${asString(ax.id)}" reads ${asString(ax.score) || Number(ax.score) || 0} (${asString(ax.confidence)}/${asString(ax.read_status)})`,
        },
        rq,
      };
    }
  }
  return { result: null, rq };
}

// WRONG_MEETING_TYPE — the question bank should follow the meeting type's arc.
// Fails if fewer than half the arc stages are represented.
function checkWrongMeetingType(meetingType: string, bankQuestions: unknown) {
  let arc;
  try {
    arc = getArc(meetingType);
  } catch {
    return { result: null, warning: `unknown meeting type "${meetingType}" — coverage check skipped` };
  }
  const expected = (arc?.arc || []).map((s) => s.id).filter(Boolean);
  if (!expected.length) return { result: null };
  const bank = Array.isArray(bankQuestions) ? bankQuestions : [];
  const seen = new Set(bank.map((q) => asString(asRecord(q).stage)).filter(Boolean));
  const matched = expected.filter((id) => seen.has(id));
  const ratio = matched.length / expected.length;
  if (ratio < 0.5) {
    return {
      result: {
        reason: HARD_FAIL.WRONG_MEETING_TYPE,
        detail: `only ${matched.length}/${expected.length} arc stages covered for "${meetingType}"`,
      },
    };
  }
  return { result: null };
}

// QUESTION_INTEGRITY — invariants over the questions actually served this
// session (frozen from the Jun 11 Machar demo failures):
//   1. No two served questions with near-identical text.
//   2. No served question matching the meeting type's forbidden patterns.
//   3. No engine-internal debug text in a served question's description.
//   4. No bank-sourced question from outside this session's own bank
//      (source "generated" must appear in the session's 03-question-bank).
function checkQuestionIntegrity(transcript: LooseTurn[], bankQuestions: unknown, meetingType: string): string[] {
  const failures: string[] = [];
  const served = (transcript || []).map((t) => t.question).filter((q): q is LooseQuestion => Boolean(q));

  for (let i = 0; i < served.length; i += 1) {
    for (let j = i + 1; j < served.length; j += 1) {
      if (isDuplicateText(served[i]?.name, served[j]?.name)) {
        failures.push(`duplicate question text served (turns ${i + 1} and ${j + 1}): "${served[j]?.name}"`);
      }
    }
  }

  const patterns = forbiddenPatternsFor(meetingType);
  for (const q of served) {
    const text = `${q.name || ""} ${q.label || ""} ${q.description || ""}`;
    for (const re of patterns) {
      if (re.test(text)) {
        failures.push(`forbidden-pattern question served for "${meetingType}": "${q.name}" (${re})`);
      }
    }
  }

  const DEBUG_TEXT = /\b(runtime|injected|planner|debug)\b/i;
  for (const q of served) {
    if (DEBUG_TEXT.test(q.description || "")) {
      failures.push(`engine-internal text in served question description: "${q.description}"`);
    }
  }

  const bank = Array.isArray(bankQuestions) ? bankQuestions : [];
  const bankAliases = new Set(bank.map((b) => asString(asRecord(b).alias)).filter(Boolean));
  if (bankAliases.size) {
    for (const q of served) {
      if (q.source === "generated" && !bankAliases.has(q.alias ?? "")) {
        failures.push(`bank-sourced question not in this session's bank: ${q.alias} ("${q.name}")`);
      }
    }
  }

  return failures;
}

function checkSchemaInvalid(briefing: unknown, transcript: LooseTurn[]) {
  if (!isObjectRecord(briefing)) {
    return { reason: HARD_FAIL.SCHEMA_INVALID, detail: "briefing missing or unparseable" };
  }
  const missing = REQUIRED_BRIEFING_KEYS.filter((k) => !(k in briefing));
  if (missing.length) {
    return { reason: HARD_FAIL.SCHEMA_INVALID, detail: `missing keys: ${missing.join(", ")}` };
  }
  if (!isBriefingShape(briefing)) {
    return { reason: HARD_FAIL.SCHEMA_INVALID, detail: "axes missing or not an array" };
  }
  // Axis score range / off-scale (state match not required here).
  const integrity = runEvalIntegrityChecks(briefing, null, transcript || [], { requireStateMatch: false })
    .filter((f) => f.includes("outside") || f.includes("off-scale"));
  if (integrity.length) {
    return { reason: HARD_FAIL.SCHEMA_INVALID, detail: integrity.join("; ") };
  }
  return null;
}

interface ReadQuality {
  partial_read: boolean;
  note_turns: number;
  total_turns: number;
}

interface TrustChecksInput {
  briefing?: unknown;
  transcript?: unknown;
  managerNotes?: unknown;
  bankQuestions?: unknown;
  focusPoints?: unknown;
  meetingType?: string;
  ctx?: { role?: string; seniority?: string } | null;
  metrics?: unknown;
}

// Run all deterministic checks. `metrics` (from scripts/lib/session-scores) is
// optional context that gets logged as a trend, never gated.
function runTrustChecks({ briefing, transcript = [], managerNotes = "", bankQuestions = [], focusPoints = [], meetingType, ctx = null, metrics = null }: TrustChecksInput = {}) {
  const hard_fails: string[] = [];
  const warnings: string[] = [];
  const details: string[] = [];
  const turns = toLooseTranscript(transcript);
  const type = meetingType || "";

  // Schema first — if the briefing is broken, the other content checks are moot.
  const schema = checkSchemaInvalid(briefing, turns);
  if (schema) {
    hard_fails.push(schema.reason);
    details.push(schema.detail);
    return finalize({ hard_fails, warnings, details, metrics });
  }
  // checkSchemaInvalid already fails any non-Briefing input, so this narrows
  // briefing to the structural Briefing the engine gates below require.
  if (!isBriefingShape(briefing)) {
    return finalize({ hard_fails, warnings, details, metrics });
  }

  const leak = checkPrivateNoteLeak(managerNotes, briefing);
  if (leak) {
    hard_fails.push(leak.reason);
    details.push(leak.detail);
  }

  const inferred = checkInferredStateLeak(managerNotes, turns, briefing);
  if (inferred.length) {
    hard_fails.push(HARD_FAIL.INFERRED_STATE_LEAK);
    details.push(...inferred);
  }

  const thin = checkThinInputSuppression(managerNotes, turns, briefing, focusPoints);
  if (thin.length) {
    hard_fails.push(HARD_FAIL.THIN_INPUT_SUPPRESSION);
    details.push(...thin);
  }

  const anchor = checkEvidenceAnchor(managerNotes, focusPoints);
  if (anchor.length) {
    hard_fails.push(HARD_FAIL.EVIDENCE_ANCHOR);
    details.push(...anchor);
  }

  const over = checkOverdiagnosisOnThin(turns, briefing);
  if (over.result) {
    hard_fails.push(over.result.reason);
    details.push(over.result.detail);
  }

  const typeCheck = checkWrongMeetingType(type, bankQuestions);
  if (typeCheck.result) {
    hard_fails.push(typeCheck.result.reason);
    details.push(typeCheck.result.detail);
  }
  if (typeCheck.warning) warnings.push(typeCheck.warning);

  const integrity = checkQuestionIntegrity(turns, bankQuestions, type);
  if (integrity.length) {
    hard_fails.push(HARD_FAIL.QUESTION_INTEGRITY);
    details.push(...integrity);
  }

  const crossSession = runCrossSessionLeakCheck(turns, managerNotes);
  if (crossSession.length) {
    hard_fails.push(HARD_FAIL.CROSS_SESSION_QUESTION_LEAK);
    details.push(...crossSession);
  }

  // Grounding audit is log-only for now: visible in gate details while the
  // false-positive rate is unknown. Promote to a warning/hard fail once a few
  // gate runs show it stays quiet on the happy cases (parked in
  // docs/todo/done/engine-trust-gates/PLAN.md).
  const grounding = runQuestionGroundingChecks(turns, managerNotes);
  if (grounding.length) {
    details.push(...grounding.map((d) => `UNGROUNDED_PREMISE (log-only): ${d}`));
  }

  const vocab = runManagerBriefingBans(briefing);
  if (vocab.length) {
    hard_fails.push(HARD_FAIL.ENGINE_VOCAB_LEAK);
    details.push(...vocab);
  }

  const focusArc = runFocusArcGate(focusPoints, type);
  if (focusArc.length) {
    hard_fails.push(HARD_FAIL.FOCUS_ARC_LEAK);
    details.push(...focusArc);
  }

  const questionArc = runQuestionArcGate(turns, type);
  if (questionArc.length) {
    hard_fails.push(HARD_FAIL.QUESTION_ARC_LEAK);
    details.push(...questionArc);
  }

  // Warning, not a hard fail: a signal-free session is legitimately silent,
  // but 4+ substantive answers with zero axis movement is an engine fault
  // until proven otherwise (AXIS_SILENT_SESSION).
  for (const w of runAxisSilenceCheck(briefing, turns)) {
    warnings.push(`AXIS_SILENT_SESSION: ${w}`);
  }

  // Warning: axis meaning that echoes rule-example framing. The runtime guard
  // already drops its confidence to low; the gate surfaces it for review.
  for (const w of runMeaningRuleEchoCheck(briefing)) {
    warnings.push(`RULE_ECHO_MEANING: ${w}`);
  }

  const profileVocab = runRoleProfileVocabLeak(briefing);
  if (profileVocab.length) {
    hard_fails.push(HARD_FAIL.ROLE_PROFILE_VOCAB_LEAK);
    details.push(...profileVocab);
  }

  // Render-time arc gate over whatever profile this ctx resolves to on disk
  // (null-safe: no profile → trivially clean; the smoke scenario covers the
  // loaded case end-to-end).
  if (ctx && ctx.role && ctx.seniority) {
    const profileArc = runRoleProfileArcGate(loadRoleProfile(ctx), type);
    if (profileArc.length) {
      hard_fails.push(HARD_FAIL.ROLE_PROFILE_ARC_LEAK);
      details.push(...profileArc);
    }
  }

  return finalize({ hard_fails, warnings, details, metrics, read_quality: over.rq });
}

function finalize({ hard_fails, warnings, details, metrics, read_quality }: {
  hard_fails: string[];
  warnings: string[];
  details: string[];
  metrics?: unknown;
  read_quality?: ReadQuality | null;
}) {
  const verdict = hard_fails.length ? "FAIL" : warnings.length ? "WARN" : "PASS";
  return {
    verdict,
    hard_fails: [...new Set(hard_fails)],
    warnings,
    details,
    metrics: metrics || null,
    read_quality: read_quality
      ? { partial_read: read_quality.partial_read, note_turns: read_quality.note_turns, total_turns: read_quality.total_turns }
      : null,
  };
}

export {
  HARD_FAIL,
  runTrustChecks,
  employeeFacingText,
  managerFacingText,
  checkPrivateNoteLeak,
  checkOverdiagnosisOnThin,
  checkWrongMeetingType,
  checkSchemaInvalid,
  checkQuestionIntegrity,
  checkInferredStateLeak,
  checkThinInputSuppression,
  checkEvidenceAnchor,
};
