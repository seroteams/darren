// Human-readable stage names — shared by topbar, start page, notes, etc.
//
// ONE name per step, at every width (Carl, 2026-07-29, audit small sweep). There used to be
// a long form and a short form: the topbar painted the long labels, measured whether the
// strip overflowed, and fell back to the short ones. A guest has no nav rail, so more room,
// so guests read "During the meeting" where a manager read "Meeting" — the same step with
// two names depending on who you were and how wide your window was. The long forms are gone.

export const STAGE_DISPLAY = Object.freeze({
  START: "Start",
  INTAKE: "Setup",
  FOCUS_POINTS: "Focus",
  PREPARATION: "Prep",
  BANK: "Questions",
  QUESTIONING: "Meeting",
  EVAL: "Wrap-up",
  BRIEFING: "Recap",
  RUN_DEBRIEF: "Session review",
  LEXICON_REVIEW: "Coaching phrases",
  ROLE_LEXICONS: "Role words",
  PERSONAS: "Personas",
  ERROR: "Error",
});

export function stageLabel(stage) {
  return STAGE_DISPLAY[stage] || stage || "–";
}

// [key, label] — one label, no second form to drift. The topbar still degrades when the
// strip runs out of room, but by shrinking steps to their nodes, never by renaming them.
// Written as literals rather than STAGE_DISPLAY lookups so a source-reading guard can pull
// the seven keys out with a regex (stage-lookback.test.ts does exactly that). They cannot
// drift from STAGE_DISPLAY: stage-labels.test.ts asserts every pair matches it.
export const TOPBAR_STAGES = Object.freeze([
  ["INTAKE", "Setup"],
  ["FOCUS_POINTS", "Focus"],
  ["PREPARATION", "Prep"],
  ["BANK", "Questions"],
  ["QUESTIONING", "Meeting"],
  ["EVAL", "Wrap-up"],
  ["BRIEFING", "Recap"],
]);
