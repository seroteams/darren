// Human-readable stage names — shared by topbar, start page, notes, etc.

export const STAGE_DISPLAY = Object.freeze({
  START: "Start",
  INTAKE: "Setup",
  FOCUS_POINTS: "Focus areas",
  PREPARATION: "Prep brief",
  BANK: "Questions",
  QUESTIONING: "Live Q&A",
  EVAL: "Synthesis",
  BRIEFING: "Briefing",
  RUN_DEBRIEF: "Session review",
  LEXICON_REVIEW: "Phrase library",
  ROLE_LEXICONS: "Job lexicons",
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
  ["QUESTIONING", "Live Q&A", "Q&A"],
  ["EVAL", "Synthesis", "Synth"],
  ["BRIEFING", "Briefing", "Brief"],
]);
