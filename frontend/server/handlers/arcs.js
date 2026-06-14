// Meeting arcs API. Read = every 1:1 type's arc (phases, tone, anti-patterns),
// already merged with any saved overlay, plus an `edited` flag per type. No model
// calls. Write/reset land in Phase 3.

const { listTypes, getArc } = require("../../../src/one-on-one-types");
const { loadOverlay } = require("../../../src/arc-overlay");

function list(c) {
  const arcs = listTypes().map((t) => {
    const a = getArc(t.label);
    return {
      slug: t.slug,
      label: t.label,
      edited: Boolean(loadOverlay(t.slug)),
      tone_register: a.tone_register || "",
      anti_patterns: Array.isArray(a.anti_patterns) ? a.anti_patterns : [],
      arc: (a.arc || []).map((s) => ({
        id: s.id,
        label: s.label || s.id,
        intent: s.intent || "",
        target_questions: Number.isInteger(s.target_questions) ? s.target_questions : 0,
      })),
    };
  });
  c.json(200, { arcs });
}

module.exports = { list };
