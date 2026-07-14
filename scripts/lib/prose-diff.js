// Pure prose comparison for the golden-prose snapshot harness (H5 — "did a change
// make the writing worse?"). No I/O, no model calls: given an approved briefing
// snapshot and a freshly produced briefing, decide whether the WORDING drifted.
//
// gate.js / replay compare trust-check verdicts and (offline) frozen input; they
// can't see a prompt edit that keeps the output schema-valid + trust-clean but
// makes it blander or less specific. This closes that gap by comparing the
// actual prose fields.

// The employee/manager-facing TEXT fields we track (axis numbers are handled by
// the trust gate, not here).
const PROSE_FIELDS = [
  "headline",
  "summary_bullets",
  "understanding_paragraph",
  "brutal_truth_employee",
  "brutal_truth_manager",
  "next_actions",
  "watch_for",
];

// Flatten any string / array / object field into one text blob.
function fieldText(v) {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(fieldText).join(" ");
  if (v && typeof v === "object") return Object.values(v).map(fieldText).join(" ");
  return "";
}

function tokens(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// Token-set (Jaccard) similarity: 1.0 = identical wording, → 0 = fully rewritten.
// Coarse on purpose — it flags a field that was substantially reworded, not
// every synonym swap.
function similarity(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 1 : inter / union;
}

// Compare two briefings field-by-field. `changed` is the hard signal (a field
// drifted below tolerance); the judge (in the CLI) adds an advisory better/worse.
function diffProse(approved, produced, { tolerance = 0.8 } = {}) {
  const fields = PROSE_FIELDS.map((f) => {
    const ratio = similarity(fieldText((approved || {})[f]), fieldText((produced || {})[f]));
    return { field: f, ratio: Number(ratio.toFixed(3)), changed: ratio < tolerance };
  });
  const overall = fields.reduce((s, f) => s + f.ratio, 0) / (fields.length || 1);
  return {
    changed: fields.some((f) => f.changed),
    overall: Number(overall.toFixed(3)),
    tolerance,
    fields,
  };
}

// The subset of a briefing we bless as the approved snapshot.
function snapshotProse(briefing) {
  const out = {};
  for (const f of PROSE_FIELDS) out[f] = (briefing || {})[f];
  return out;
}

module.exports = { diffProse, snapshotProse, similarity, fieldText, PROSE_FIELDS };
