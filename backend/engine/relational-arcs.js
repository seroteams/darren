// Single source of truth for the relational-arc rule.
//
// Bi-weekly check-in and "Something feels off" are relational arcs: their focus
// points must come from `wellbeing`/`topic` entries only. A `competency`
// (evaluative) focus point reads as a hidden performance review and breaks the
// frame. This is enforced two ways: the generator never offers competency
// entries to the model for these arcs (src/generate.js), and the trust gate
// flags any that slip through (src/golden-checks.js → FOCUS_ARC_LEAK).
//
// Matched by slug or label, case-insensitive.
const RELATIONAL_ARCS = new Set([
  "bi_weekly_check_in",
  "bi-weekly check-in",
  "something_feels_off",
  "something feels off",
]);

function isRelationalArc(meetingType) {
  return RELATIONAL_ARCS.has(String(meetingType || "").trim().toLowerCase());
}

module.exports = { RELATIONAL_ARCS, isRelationalArc };
