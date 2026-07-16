// Human-readable stage names — shared by topbar, start page, notes, etc.

export const STAGE_DISPLAY = Object.freeze({
  START: "Start",
  INTAKE: "Setup",
  FOCUS_POINTS: "Focus areas",
  PREPARATION: "Prep brief",
  BANK: "Questions",
  QUESTIONING: "During the meeting",
  EVAL: "Pulling it together",
  BRIEFING: "Recap",
  RUN_DEBRIEF: "Session review",
  LEXICON_REVIEW: "Coaching phrases",
  ROLE_LEXICONS: "Role words",
  PERSONAS: "Personas",
  ERROR: "Error",
});

export function stageLabel(stage) {
  return STAGE_DISPLAY[stage] || stage || "—";
}

export const TOPBAR_STAGES = Object.freeze([
  ["INTAKE", "Setup", "Setup"],
  ["FOCUS_POINTS", "Focus areas", "Focus"],
  ["PREPARATION", "Prep brief", "Prep"],
  ["BANK", "Questions", "Questions"],
  ["QUESTIONING", "During the meeting", "Meeting"],
  ["EVAL", "Pulling it together", "Wrap-up"],
  ["BRIEFING", "Recap", "Recap"],
]);
