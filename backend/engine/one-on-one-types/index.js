// 1:1 Type registry.
// Each Type lives in its own folder (<slug>/type.js) and inherits the shared
// house prompts from _shared/. This registry resolves a Type by label or slug.
//
// Phase 0: getType/listTypes are the new public API; getArc/listStageIds/MEETING_ARCS
// are kept as thin back-compat shims (same shapes + error messages as the old
// src/meeting-arcs.js) so existing consumers run unchanged.

const { SHARED_PROMPTS } = require("./_shared/prompts.ts");
const { applyOverlay } = require("../arc-overlay.ts");
const biWeekly = require("./bi-weekly/type");
const performance = require("./performance/type");
const growth = require("./growth/type");
const feelsOff = require("./feels-off/type");
const onboarding = require("./onboarding/type");

// Order mirrors the picker order in src/meeting-types.js.
const TYPES = [biWeekly, performance, growth, feelsOff, onboarding];

const BY_LABEL = Object.fromEntries(TYPES.map((t) => [t.label, t]));
const BY_SLUG = Object.fromEntries(TYPES.map((t) => [t.slug, t]));

function getType(meetingType) {
  if (!meetingType) {
    throw new Error("getType: meetingType is required");
  }
  if (BY_LABEL[meetingType]) return applyOverlay(BY_LABEL[meetingType]);
  if (BY_SLUG[meetingType]) return applyOverlay(BY_SLUG[meetingType]);
  const known = TYPES.map((t) => t.label).join(", ");
  throw new Error(`getType: unknown 1:1 type "${meetingType}". Known: ${known}`);
}

function listTypes() {
  return TYPES;
}

// Resolve the prompt file path for a stage slot (preparation, focusPoints,
// questionBank, planTurn, evaluation, lexicon) for a given 1:1 Type. Falls back
// to the shared house prompt if the Type is missing/unknown or doesn't override
// the slot. This is the seam every stage runner uses — forking a stage = drop a
// file in the Type's folder and point its type.js at it; no runner change needed.
function promptFor(meetingType, slot) {
  let type = null;
  try {
    type = getType(meetingType);
  } catch {
    type = null;
  }
  return (type && type.prompts && type.prompts[slot]) || SHARED_PROMPTS[slot];
}

// --- Back-compat: arc-shaped view (the slim object old consumers expect) ---

function toArc(t) {
  return {
    slug: t.slug,
    tone_register: t.tone_register,
    arc: t.arc,
    anti_patterns: t.anti_patterns,
  };
}

const MEETING_ARCS = Object.fromEntries(TYPES.map((t) => [t.label, toArc(t)]));
const ARCS_BY_SLUG = Object.fromEntries(Object.values(MEETING_ARCS).map((a) => [a.slug, a]));

function getArc(meetingType) {
  if (!meetingType) {
    throw new Error("getArc: meetingType is required");
  }
  // Resolve the base type, then merge any saved overlay over it at read time so
  // edits take effect with no server restart. MEETING_ARCS stays the static
  // default map (back-compat); only this read path is overlay-aware.
  const base = BY_LABEL[meetingType] || BY_SLUG[meetingType];
  if (base) return toArc(applyOverlay(base));
  const known = Object.keys(MEETING_ARCS).join(", ");
  throw new Error(`getArc: unknown meeting type "${meetingType}". Known: ${known}`);
}

function listStageIds(meetingType) {
  return getArc(meetingType).arc.map((s) => s.id);
}

module.exports = { TYPES, getType, listTypes, promptFor, MEETING_ARCS, getArc, listStageIds };
