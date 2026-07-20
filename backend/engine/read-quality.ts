// The one place a turn's answer is classified into a read-quality tag.
//
// Computed ONCE at plan-turn (queue-manager.ts), banked on TranscriptEntry.read,
// and consumed — not recomputed — by reviewer.ts computeReadQuality. Before this
// module the shallow / decline word-lists lived in TWO hand-synced copies
// (delta-gates.ts isShallowAnswer + reviewer.ts computeReadQuality); they now
// live here once and both callers import them.
//
// A turn reads as:
//   "skip"    — the manager captured no note (skipped, or an empty jot)
//   "decline" — an agenda-neutral brush-off ("nothing to add")
//   "thin"    — a ≤2-token / low-content note, or one the scorer marked [SHALLOW]
//   "note"    — a real note carrying signal
//
// The classifier mirrors reviewer.computeReadQuality's per-turn reason exactly:
// answers are the manager's terse shorthand of the report's reply, so a 3-token
// note is real signal — only genuinely content-free turns fall below "note".
import type { TurnRead } from "../shared/session.types.ts";

// A reporting wrapper ("yeah he said things have been ok") can clear the token
// floor while carrying no signal. Strip it, then check what concrete content is
// left. Shared by delta-gates.isShallowAnswer and isLowContentNote below.
export const REPORTING_PREFIX =
  /^(yeah|yes|yep|ok|okay)?[\s,]*\b(he|she|they)?\s*(said|says|told me|mentioned|noted|reckons|feels|felt|thinks)\b[\s,]*(that|it)?\s*/i;

// Generic, signal-free words. A remainder built only from these carries nothing.
export const LOW_SIGNAL_WORDS = new Set([
  "things", "stuff", "it", "that", "everything", "work", "the", "a",
  "have", "has", "had", "are", "is", "was", "were", "be", "been", "being",
  "feel", "feels", "felt", "seem", "seems", "going",
  "ok", "okay", "fine", "good", "great", "alright", "steady", "same",
  "grand", "really", "just", "pretty", "quite", "bit", "so", "far",
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
export function normalizeAnswer(s: unknown): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenCount(s: unknown): number {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

export function isDecline(answer: unknown): boolean {
  const norm = normalizeAnswer(answer);
  if (!norm) return false;
  return DECLINE_PHRASES.some((p) => norm.includes(p));
}

// A note can wrap a content-free answer in a reporting verb ("yeah he said
// things have been ok") and clear the ≤2-token floor while carrying no signal.
// Strip a leading reporting wrapper, then check whether anything concrete is
// left. Conservative: only fires when a reporting wrapper was actually present,
// so a bare note with concrete content ("deadlines are tight") is never touched.
export function isLowContentNote(answer: unknown): boolean {
  const norm = normalizeAnswer(answer);
  if (!norm) return false;
  const remainder = norm.replace(REPORTING_PREFIX, "").trim();
  if (!remainder || remainder === norm) return false; // no reporting wrapper — leave to other checks
  const content = remainder.split(/\s+/).filter((w) => w && !LOW_SIGNAL_WORDS.has(w));
  return content.length === 0;
}

export function noteMarksShallow(note: unknown): boolean {
  return typeof note === "string" && note.includes("[SHALLOW]");
}

// The canonical per-turn classifier. `note` is the planner's note for the turn
// (may carry a [SHALLOW] marker). Order matches reviewer.computeReadQuality:
// skip/empty → decline → thin → note.
export function classifyAnswer(answer: unknown, note?: unknown): TurnRead {
  const text = typeof answer === "string" ? answer : "";
  const trimmed = text.trim();
  if (!trimmed || trimmed === "(skipped)") return "skip";
  if (isDecline(text)) return "decline";
  if (tokenCount(text) <= 2 || isLowContentNote(text) || noteMarksShallow(note)) return "thin";
  return "note";
}
