// 1:1 Type registry.
// Each Type lives in its own folder (<slug>/type.ts) and inherits the shared
// house prompts from _shared/. This registry resolves a Type by label or slug.
//
// Phase 0: getType/listTypes are the new public API; getArc/listStageIds/MEETING_ARCS
// are kept as thin back-compat shims (same shapes + error messages as the
// retired meeting-arcs shim, pre-monorepo) so existing consumers run unchanged.

import { SHARED_PROMPTS } from "./_shared/prompts.ts";
import { applyOverlay } from "../arc-overlay.ts";
import type { MeetingType, ArcPhase } from "./_shared/meeting-type.types.ts";
import biWeekly from "./bi-weekly/type.ts";
import performance from "./performance/type.ts";
import growth from "./growth/type.ts";
import feelsOff from "./feels-off/type.ts";
import onboarding from "./onboarding/type.ts";

// SHARED_PROMPTS has fixed keys; promptFor looks slots up dynamically, so view it
// as a string map (the concrete object is assignable to it).
const SHARED: Record<string, string> = SHARED_PROMPTS;

// The slim, arc-shaped view old consumers expect from getArc / MEETING_ARCS.
interface ArcView {
  slug: string;
  tone_register: string;
  arc: ArcPhase[];
  anti_patterns: string[];
}

// Order mirrors the picker order in src/meeting-types.js.
const TYPES: MeetingType[] = [biWeekly, performance, growth, feelsOff, onboarding];

const BY_LABEL: Record<string, MeetingType> = Object.fromEntries(TYPES.map((t): [string, MeetingType] => [t.label, t]));
const BY_SLUG: Record<string, MeetingType> = Object.fromEntries(TYPES.map((t): [string, MeetingType] => [t.slug, t]));

function getType(meetingType: string): MeetingType {
  if (!meetingType) {
    throw new Error("getType: meetingType is required");
  }
  const byLabel = BY_LABEL[meetingType];
  if (byLabel) return applyOverlay(byLabel);
  const bySlug = BY_SLUG[meetingType];
  if (bySlug) return applyOverlay(bySlug);
  const known = TYPES.map((t) => t.label).join(", ");
  throw new Error(`getType: unknown 1:1 type "${meetingType}". Known: ${known}`);
}

function listTypes(): MeetingType[] {
  return TYPES;
}

// Resolve the prompt file path for a stage slot (preparation, focusPoints,
// questionBank, planTurn, evaluation, lexicon) for a given 1:1 Type. Falls back
// to the shared house prompt if the Type is missing/unknown or doesn't override
// the slot. This is the seam every stage runner uses — forking a stage = drop a
// file in the Type's folder and point its type.js at it; no runner change needed.
function promptFor(meetingType: string, slot: string): string {
  let type: MeetingType | null = null;
  try {
    type = getType(meetingType);
  } catch {
    type = null;
  }
  const promptPath = (type && type.prompts && type.prompts[slot]) || SHARED[slot];
  // Every stage slot is present in SHARED_PROMPTS, so this only throws for an
  // unknown slot — unreachable for the fixed slot set, and a clearer failure
  // than the old undefined return crashing at the caller's readFileSync.
  if (!promptPath) throw new Error(`promptFor: no prompt registered for slot "${slot}"`);
  return promptPath;
}

// --- Back-compat: arc-shaped view (the slim object old consumers expect) ---

function toArc(t: MeetingType): ArcView {
  return {
    slug: t.slug,
    tone_register: t.tone_register,
    arc: t.arc,
    anti_patterns: t.anti_patterns,
  };
}

const MEETING_ARCS: Record<string, ArcView> = Object.fromEntries(TYPES.map((t): [string, ArcView] => [t.label, toArc(t)]));
const ARCS_BY_SLUG: Record<string, ArcView> = Object.fromEntries(
  Object.values(MEETING_ARCS).map((a): [string, ArcView] => [a.slug, a])
);

function getArc(meetingType: string): ArcView {
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

function listStageIds(meetingType: string): string[] {
  return getArc(meetingType).arc.map((s) => s.id);
}

function sumTargets(arc: ArcPhase[]): number {
  return arc.reduce((n, s) => n + (s.target_questions || 0), 0);
}

// A type's designed question count = the sum of every arc phase's target_questions.
// This is what a session's totalBudget follows, so lighter arcs (6) don't get
// stretched to the old flat 9. Built on the overlay-aware getArc, so a manager's
// saved arc edit changes the budget with no restart — used on the LIVE paths
// (server + CLI), which hydrate the overlay cache at boot.
function arcBudget(meetingType: string): number {
  return sumTargets(getArc(meetingType).arc);
}

// Overlay-FREE designed length, read straight from the code-default type. For
// offline/static callers (the fixture validators) that never hydrate the overlay
// cache — committed fixtures validate against the default arc, not a local runtime
// overlay, so this stays a pure sync read with no DB dependency.
function arcBudgetDefault(meetingType: string): number {
  const base = BY_LABEL[meetingType] || BY_SLUG[meetingType];
  if (!base) {
    const known = Object.keys(MEETING_ARCS).join(", ");
    throw new Error(`arcBudgetDefault: unknown meeting type "${meetingType}". Known: ${known}`);
  }
  return sumTargets(base.arc);
}

export { TYPES, getType, listTypes, promptFor, MEETING_ARCS, getArc, listStageIds, arcBudget, arcBudgetDefault };
