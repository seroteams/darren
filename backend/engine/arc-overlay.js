const fs = require("node:fs");
const path = require("node:path");

const questions = require("./questions");
const { DATA_DIR } = require("./paths.mts");

// Arc overlays — a manager's edits to a 1:1 Type's arc live in a sidecar file,
// `data/arc-overlays/<slug>.json`, NEVER in the canonical `type.js`. The registry
// merges the overlay over the code default at read time (see one-on-one-types),
// so the originals stay pristine and "reset" is just deleting the overlay.
// Same null-safe / atomic-write posture as the role-profile overlay.

const OVERLAYS_DIR = path.join(DATA_DIR, "arc-overlays");
const OVERLAY_VERSION = 1;

// Type slugs are lower_snake (bi_weekly_check_in). Guards the path against traversal.
const SLUG_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

function validKey(slug) {
  return typeof slug === "string" && SLUG_RE.test(slug);
}

function overlayPath(slug) {
  return path.join(OVERLAYS_DIR, `${slug}.json`);
}

// Atomic write, same pattern as role-profile.js / person-profile.js.
function writeAtomic(file, content) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

// Null-safe read: missing/corrupt/wrong-shape → null, never throws. Only the
// three editable fields are honoured; anything else in the file is ignored.
function loadOverlay(slug) {
  if (!validKey(slug)) return null;
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(overlayPath(slug), "utf8"));
  } catch {
    return null;
  }
  if (!doc || typeof doc !== "object") return null;
  const out = {};
  if (Array.isArray(doc.arc)) out.arc = doc.arc;
  if (typeof doc.tone_register === "string") out.tone_register = doc.tone_register;
  if (Array.isArray(doc.anti_patterns)) out.anti_patterns = doc.anti_patterns;
  return Object.keys(out).length ? out : null;
}

function writeOverlay(slug, data = {}) {
  if (!validKey(slug)) throw Object.assign(new Error("Unknown meeting type"), { status: 404 });
  const doc = { version: OVERLAY_VERSION, slug };
  if (Array.isArray(data.arc)) doc.arc = data.arc;
  if (typeof data.tone_register === "string") doc.tone_register = data.tone_register;
  if (Array.isArray(data.anti_patterns)) doc.anti_patterns = data.anti_patterns;
  fs.mkdirSync(OVERLAYS_DIR, { recursive: true });
  writeAtomic(overlayPath(slug), JSON.stringify(doc, null, 2) + "\n");
  return doc;
}

// Reset: delete the overlay so the type falls back to its code default.
function removeOverlay(slug) {
  if (!validKey(slug)) return false;
  try {
    fs.unlinkSync(overlayPath(slug));
    return true;
  } catch {
    return false;
  }
}

// Merge an overlay over a base Type object, returning a NEW object — the cached
// module is never mutated. Only the editable fields are overlaid.
function applyOverlay(type) {
  if (!type || !type.slug) return type;
  const overlay = loadOverlay(type.slug);
  if (!overlay) return type;
  const merged = { ...type };
  if (overlay.arc) merged.arc = overlay.arc;
  if (overlay.tone_register) merged.tone_register = overlay.tone_register;
  if (overlay.anti_patterns) merged.anti_patterns = overlay.anti_patterns;
  return merged;
}

// Validate an edited arc before it can be written. Returns { ok, errors }.
function validateArc(arc) {
  const errors = [];
  if (!Array.isArray(arc) || arc.length === 0) {
    return { ok: false, errors: ["An arc needs at least one phase."] };
  }
  const ids = [];
  arc.forEach((p, i) => {
    const where = `Phase ${i + 1}`;
    if (!p || typeof p !== "object") {
      errors.push(`${where} is malformed.`);
      return;
    }
    const id = typeof p.id === "string" ? p.id.trim() : "";
    if (!id) {
      errors.push(`${where} has an empty id.`);
    } else if (!SLUG_RE.test(id)) {
      errors.push(`Phase id "${p.id}" must be lowercase letters, numbers and underscores.`);
    } else {
      ids.push(id);
    }
    if (typeof p.label !== "string" || !p.label.trim()) {
      errors.push(`${id ? `"${id}"` : where} needs a label.`);
    }
    if (!Number.isInteger(p.target_questions) || p.target_questions < 0) {
      errors.push(`${id ? `"${id}"` : where} target questions must be a whole number of 0 or more.`);
    }
  });
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dupes.length) errors.push(`Duplicate phase ids: ${dupes.join(", ")}.`);
  return { ok: errors.length === 0, errors };
}

function readOpeners() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(questions.QUESTIONS_ROOT, "_openers.json"), "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// How many existing questions would be orphaned by a proposed arc — i.e. tagged
// to a stage id the new arc no longer has. Intro questions are folder-scoped to
// the type; openers are scoped by their stage matching one of the type's CURRENT
// ids (stage ids are arc-specific, so an opener tagged "pulse" belongs to
// bi-weekly). This is the count behind the rename/remove confirm dialog and the
// fix for the silent index-999 mis-routing in intro-queue.js.
function diffStageIds(slug, newArc, { currentStageIds = null } = {}) {
  const newIds = new Set((Array.isArray(newArc) ? newArc : []).map((p) => p && p.id).filter(Boolean));

  let intro = 0;
  for (const q of questions.loadDir(path.join("_intro", slug))) {
    if (q.stage && !newIds.has(q.stage)) intro++;
  }

  let openers = 0;
  if (Array.isArray(currentStageIds)) {
    const curSet = new Set(currentStageIds);
    for (const o of readOpeners()) {
      if (o && o.stage && curSet.has(o.stage) && !newIds.has(o.stage)) openers++;
    }
  }

  const removed_ids = Array.isArray(currentStageIds)
    ? currentStageIds.filter((id) => !newIds.has(id))
    : [];

  return { intro, openers, total: intro + openers, removed_ids };
}

module.exports = {
  OVERLAYS_DIR,
  validKey,
  overlayPath,
  loadOverlay,
  writeOverlay,
  removeOverlay,
  applyOverlay,
  validateArc,
  diffStageIds,
};
