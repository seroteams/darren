// Feedback kinds (validation-kit Phase 3b) — type an inbox row from its data so the
// Feedback screen can show an icon + label per kind. Pure and renderer-free on
// purpose: the stage imports CSS, so this lives beside it where node:test can reach.
// A future kind (e.g. a post-meeting follow-up) adds one entry to FEEDBACK_KINDS
// and one branch to noteKind — no renderer surgery.

export type FeedbackKind = "note" | "verdict";

/** What the Type cell shows per kind. `icon` names a lucide icon the stage resolves. */
export const FEEDBACK_KINDS: Record<FeedbackKind, { icon: string; label: string }> = {
  note: { icon: "MessageSquare", label: "Note" },
  verdict: { icon: "ClipboardCheck", label: "1:1 verdict" },
};

/** A verdict tap carries a run link and/or a verdict; a plain Send-feedback note
 *  carries neither. Either field alone is enough — a half-set legacy row should
 *  still read as what it is. */
export function noteKind(note: { runId?: string | null; verdict?: string | null }): FeedbackKind {
  return note.runId || note.verdict ? "verdict" : "note";
}
