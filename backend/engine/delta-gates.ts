// Scoring gates for plan-turn: shallow-answer detection, clarity-misalignment,
// and the recurring-gap clarity damper. Extracted verbatim from queue-manager.ts
// (Phase 2 repo-tidy) — pure functions, no behaviour change.
import type { TranscriptEntry } from "../shared/session.types.ts";

function isShallowAnswer(answer: string | null | undefined): boolean {
  if (!answer || typeof answer !== "string") return false;
  const trimmed = answer.trim();
  if (!trimmed) return false;
  if (trimmed === "(skipped)") return false;

  // Answers are the manager's shorthand notes — terse by design. A 3-token note
  // ("Wants clearer scope.") is real signal, so the floor is ≤2 tokens, aligned
  // with computeReadQuality in reviewer.js. The FILLER_ONLY list below still
  // catches "fine"/"good"/etc. regardless of length.
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.length <= 2) return true;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const FILLER_ONLY =
    /^(yeah|yes|yep|yup|ok|okay|fine|good|great|sure|cool|thanks|thank you|not bad|doing fine|i am fine|im fine|today is fine|its fine|it's fine|they are okay|every day|every time)$/;
  if (FILLER_ONLY.test(normalized)) return true;

  // A reporting wrapper ("yeah he said things have been ok") can clear the
  // 2-token floor while carrying no signal. Strip the wrapper; if nothing
  // concrete is left, it is shallow. Kept aligned with isLowContentNote in
  // reviewer.js.
  const REPORTING_PREFIX =
    /^(yeah|yes|yep|ok|okay)?[\s,]*\b(he|she|they)?\s*(said|says|told me|mentioned|noted|reckons|feels|felt|thinks)\b[\s,]*(that|it)?\s*/i;
  const LOW_SIGNAL_WORDS = new Set([
    "things", "stuff", "it", "that", "everything", "work", "the", "a",
    "have", "has", "had", "are", "is", "was", "were", "be", "been", "being",
    "feel", "feels", "felt", "seem", "seems", "going",
    "ok", "okay", "fine", "good", "great", "alright", "steady", "same",
    "grand", "really", "just", "pretty", "quite", "bit", "so", "far",
  ]);
  const remainder = normalized.replace(REPORTING_PREFIX, "").trim();
  if (remainder && remainder !== normalized) {
    const content = remainder.split(/\s+/).filter((w) => w && !LOW_SIGNAL_WORDS.has(w));
    if (content.length === 0) return true;
  }
  return false;
}

function noteMarksShallow(note: unknown): boolean {
  return typeof note === "string" && note.includes("[SHALLOW]");
}

function detectClarityMisalignment(answer: string | null | undefined): boolean {
  if (!answer || typeof answer !== "string") return false;
  const lower = answer.toLowerCase();
  if (/\bmay think this\b.*\bmay think that\b/.test(lower)) return true;
  if (/\b(i|my|me)\b/.test(lower) && /\b(boss|manager|lead)\b/.test(lower)) {
    if (/\b(think|expects|expected|want|needs|learn|understand|align)\b/.test(lower)) return true;
  }
  if (/\b(not aligned|misaligned|on different pages|different expectations)\b/.test(lower)) return true;
  return false;
}

function expandSignatureForSignals(signature: Record<string, number> | null | undefined, answer: string | null | undefined): Record<string, number> {
  const sig: Record<string, number> = { ...(signature || {}) };
  if (detectClarityMisalignment(answer) && sig.clarity == null) {
    sig.clarity = 3;
  }
  return sig;
}

function applyShallowGate(rawDeltas: Record<string, number>, { lastAnswer, note, issues }: { lastAnswer: string | null | undefined; note: unknown; issues: string[] }): boolean {
  const answerIsSkip = !lastAnswer || lastAnswer === "(skipped)";
  const shallow = !answerIsSkip && (isShallowAnswer(lastAnswer) || noteMarksShallow(note));
  if (!shallow) return false;
  for (const axis of Object.keys(rawDeltas)) {
    if (rawDeltas[axis] !== 0) {
      issues.push(`shallow answer — zeroed ${axis} (${(rawDeltas[axis] ?? 0) > 0 ? "+" : ""}${rawDeltas[axis]})`);
      rawDeltas[axis] = 0;
    }
  }
  return true;
}

function applyMisalignmentClarity(rawDeltas: Record<string, number>, { lastAnswer, signature, issues }: { lastAnswer: string | null | undefined; signature: Record<string, number>; issues: string[] }): void {
  if (!detectClarityMisalignment(lastAnswer)) return;
  if (!Object.prototype.hasOwnProperty.call(signature, "clarity")) return;
  const mag = Math.abs(signature.clarity ?? 0);
  const current = rawDeltas.clarity;
  if (current == null || current >= 0) {
    const applied = -Math.min(mag, 1);
    rawDeltas.clarity = applied;
    issues.push(`misalignment signal — applied clarity ${applied}`);
  }
}

// Recurring-gap clarity damper. A concrete craft gap surfaced on a competency
// question (missed edge case, uncovered state, defect found in review) is
// evidence about the *work*, not proof the report lacks role/priority clarity.
// plan-turn.md tells the model to book at most one full-magnitude clarity hit
// on a recurring gap and cap later descriptions at -1, but the model stacks
// -3s across consecutive gap turns (the Maya run clamped clarity to -10 off one
// repeated fact). Enforce it deterministically: once any prior competency turn
// has booked a negative clarity delta, cap this turn's clarity at -1.
function priorCompetencyClarityHit(transcript: TranscriptEntry[] | null | undefined): boolean {
  for (const t of transcript || []) {
    if (t?.question?.purpose !== "competency") continue;
    const d = t?.realized_deltas;
    if (d && Number(d.clarity) < 0) return true;
  }
  return false;
}

// Connective/filler words stripped before comparing two notes — we match on the
// content of the gap, not the grammar around it.
const DAMPER_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "it",
  "is", "are", "was", "were", "be", "she", "he", "they", "her", "his", "them",
  "i", "we", "you", "that", "this", "but", "not", "no", "so", "if", "as", "at",
  "before", "after", "what", "when", "how", "why", "still", "mostly", "more",
  "less", "too", "very", "just", "then", "than", "into", "out", "up", "down",
]);

function answerThemeTokens(text: unknown): Set<string> {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !DAMPER_STOPWORDS.has(w))
  );
}

// Two short notes are "the same recurring point" when their content words
// overlap on 2+ terms. Distinct gaps (different nouns) don't trip this, so a
// genuinely new clarity issue still scores at full weight.
function sharesAnswerTheme(a: unknown, b: unknown): boolean {
  const ta = answerThemeTokens(a);
  if (ta.size < 2) return false;
  const tb = answerThemeTokens(b);
  if (tb.size < 2) return false;
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared++;
  return shared >= 2;
}

// Has an earlier turn already booked a negative clarity hit on the SAME point
// the current answer is making? Theme-based, so it fires regardless of how the
// question's `purpose` was tagged — including scripted runs (purpose:"scripted")
// where the competency gate above never matches.
function priorSameThemeClarityHit(transcript: TranscriptEntry[] | null | undefined, currentAnswer: unknown): boolean {
  for (const t of transcript || []) {
    const d = t?.realized_deltas;
    if (!(d && Number(d.clarity) < 0)) continue;
    if (sharesAnswerTheme(currentAnswer, t?.answer)) return true;
  }
  return false;
}

function applyRecurringGapClarityDamper(rawDeltas: Record<string, number>, { lastQuestion, transcript, issues, lastAnswer }: { lastQuestion: { purpose?: string } | null | undefined; transcript: TranscriptEntry[] | null | undefined; issues: string[]; lastAnswer: unknown }): void {
  const current = rawDeltas.clarity;
  if (current == null || current >= -1) return;
  // Trigger A — craft-gap competency stacking (the original Jun03 case).
  const competencyRecurrence =
    lastQuestion?.purpose === "competency" && priorCompetencyClarityHit(transcript);
  // Trigger B — the same point re-scored across turns, whatever the purpose tag.
  // This is what floored the Maya Jun17 run: six turns all describing one
  // review-readiness gap, each booking a fresh clarity negative to -10.
  const themeRecurrence = priorSameThemeClarityHit(transcript, lastAnswer);
  if (!competencyRecurrence && !themeRecurrence) return;
  issues.push(`recurring-gap damper — capped clarity ${current} → -1`);
  rawDeltas.clarity = -1;
}

export {
  isShallowAnswer,
  noteMarksShallow,
  detectClarityMisalignment,
  expandSignatureForSignals,
  applyShallowGate,
  applyMisalignmentClarity,
  applyRecurringGapClarityDamper,
};
