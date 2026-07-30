// Feedback kinds (validation-kit Phase 3b) — type an inbox row from its data so the
// Feedback screen can show an icon + label per kind. Pure and renderer-free on
// purpose: the stage imports CSS, so this lives beside it where node:test can reach.
// A future kind (e.g. a post-meeting follow-up) adds one entry to FEEDBACK_KINDS
// and one branch to noteKind — no renderer surgery.

export type FeedbackKind = "note" | "verdict" | "brief";

/** What the Type cell shows per kind. `icon` names a lucide icon the stage resolves. */
export const FEEDBACK_KINDS: Record<FeedbackKind, { icon: string; label: string }> = {
  note: { icon: "MessageSquare", label: "Note" },
  verdict: { icon: "ClipboardCheck", label: "1:1 verdict" },
  brief: { icon: "Star", label: "Brief rating" },
};

/** A brief rating carries a score; a verdict tap carries a run link and/or a verdict;
 *  a plain Send-feedback note carries neither. The score is checked FIRST because a
 *  brief rating also carries a run link, and would otherwise read as a verdict.
 *  Either verdict field alone is enough — a half-set legacy row should still read as
 *  what it is. */
export function noteKind(note: {
  runId?: string | null;
  verdict?: string | null;
  stars?: number | null;
}): FeedbackKind {
  if (typeof note.stars === "number") return "brief";
  return note.runId || note.verdict ? "verdict" : "note";
}
