// Meeting arcs API.
//   GET  /api/arcs            → every 1:1 type's arc (phases, tone, anti-patterns),
//                               already merged with any saved overlay, plus `edited`.
//   POST /api/arcs/:slug      → save an edited arc to the overlay (never the source).
//   POST /api/arcs/:slug/reset → delete the overlay, back to the code default.
// No model calls anywhere here. Writes are behind the localhost origin guard.

const { listTypes, getArc } = require("../../engine/one-on-one-types/index.ts");
const {
  loadOverlay,
  writeOverlay,
  removeOverlay,
  validateArc,
  diffStageIds,
  validKey,
} = require("../../engine/arc-overlay.ts");

function notFound() {
  return Object.assign(new Error("Unknown meeting type"), { status: 404 });
}

// The slim, client-facing shape of one arc.
function serialize(t) {
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
}

function list(c) {
  c.json(200, { arcs: listTypes().map(serialize) });
}

// Coerce one incoming phase into the stored shape — trims strings and forces
// target_questions to a whole number so validateArc gets clean input.
function normalizePhase(p) {
  if (!p || typeof p !== "object") return p;
  const n = Number(p.target_questions);
  return {
    id: typeof p.id === "string" ? p.id.trim() : p.id,
    label: typeof p.label === "string" ? p.label.trim() : p.label,
    intent: typeof p.intent === "string" ? p.intent.trim() : "",
    target_questions: Number.isFinite(n) ? Math.trunc(n) : p.target_questions,
  };
}

function warningText(diff) {
  const ids = diff.removed_ids.length ? `"${diff.removed_ids.join('", "')}"` : "a phase";
  const parts = [];
  if (diff.intro) parts.push(`${diff.intro} intro`);
  if (diff.openers) parts.push(`${diff.openers} opener`);
  const breakdown = parts.length ? ` (${parts.join(", ")})` : "";
  return `Removing or renaming ${ids} would orphan ${diff.total} question${diff.total === 1 ? "" : "s"}${breakdown} — they'd no longer route to a phase. Save anyway?`;
}

async function save(c) {
  const { slug } = c.params;
  if (!validKey(slug)) return c.error(notFound());

  // Confirm the slug is a real type and grab its current stage ids for the diff.
  let current;
  try {
    current = getArc(slug);
  } catch {
    return c.error(notFound());
  }

  const body = (await c.readBody()) || {};
  if (!Array.isArray(body.arc)) {
    return c.error(Object.assign(new Error("An arc (list of phases) is required."), { status: 400 }));
  }
  const arc = body.arc.map(normalizePhase);

  const { ok, errors } = validateArc(arc);
  if (!ok) return c.error(Object.assign(new Error(errors.join(" ")), { status: 400 }));

  const currentStageIds = current.arc.map((s) => s.id);
  const diff = diffStageIds(slug, arc, { currentStageIds });

  // Risky save (a removed/renamed id has tagged questions): hold unless confirmed.
  if (diff.total > 0 && !body.confirm) {
    return c.json(200, { needsConfirm: true, warning: warningText(diff), orphans: diff });
  }

  writeOverlay(slug, {
    arc,
    tone_register: typeof body.tone_register === "string" ? body.tone_register : undefined,
    anti_patterns: Array.isArray(body.anti_patterns)
      ? body.anti_patterns.map((s) => String(s).trim()).filter(Boolean)
      : undefined,
  });

  return c.json(200, { ok: true, arc: serialize(BY_SLUG_LABEL(slug)) });
}

// getArc/serialize key off the Type; map a slug back to its {slug,label} stub.
function BY_SLUG_LABEL(slug) {
  return listTypes().find((t) => t.slug === slug);
}

function reset(c) {
  const { slug } = c.params;
  if (!validKey(slug)) return c.error(notFound());
  const t = BY_SLUG_LABEL(slug);
  if (!t) return c.error(notFound());
  removeOverlay(slug);
  return c.json(200, { ok: true, arc: serialize(t) });
}

module.exports = { list, save, reset };
