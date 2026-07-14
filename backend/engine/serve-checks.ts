// H4 — serve-time leak detection (leaf module).
//
// The two most dangerous leaks — a manager's PRIVATE judgment reaching the
// employee, and an INVENTED internal state ("disengaged", "flight risk") the
// input never carried — must be caught on the path that serves real managers,
// not only in the offline gate on ~15 fixtures.
//
// These detectors were the pure, briefing-only checks inside evals/trust-checks.ts.
// They live here now so BOTH the live path (reviewer.evaluate) and the gate
// (evals/trust-checks re-imports them) call the exact same code — zero
// duplication. This module is a LEAF: it imports only shared guards, so
// reviewer.ts can use it without the reviewer→trust-checks→reviewer import cycle.

import { isObjectRecord, asRecord, asString } from "../shared/guards.ts";

// Reason codes (kept identical to evals/trust-checks HARD_FAIL values).
export const PRIVATE_NOTE_LEAK = "PRIVATE_NOTE_LEAK";
export const INFERRED_STATE_LEAK = "INFERRED_STATE_LEAK";

// A turn only needs its answer text for these checks.
type TurnLike = { answer?: string };

// Manager fields the employee never sees. Everything else in the briefing is
// employee-facing / shareable, so a private worry reaching any of those is a
// leak. brutal_truth_manager is the manager-only channel and is exempt.
const MANAGER_ONLY_FIELDS = new Set(["brutal_truth_manager"]);

// Words that flag a clause as the manager's private *judgment* (not a neutral
// observation). The leak check only fires when a judgment clause is reused — so
// a note like "just joined, shipped payments refactor" (pure observation) never
// trips it, but "I doubt he's ready to lead" does.
const JUDGMENT_MARKERS = [
  "doubt", "not sure", "unsure", "worried", "worry", "concern", "concerned",
  "readiness", "ready", "confidence", "confident", "insecure", "hesitant",
  "coasting", "checked out", "struggling", "weak", "lacking", "immature",
  "maturity", "not management material", "interviewing", "disengaged",
];
const MARKER_RE = new RegExp(
  `\\b(${JUDGMENT_MARKERS.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i",
);

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "to", "for", "with",
  "is", "are", "was", "were", "be", "been", "has", "have", "had", "his", "her", "their", "they",
  "he", "she", "it", "i", "im", "ive", "that", "this", "about", "into", "at",
  "as", "by", "from", "still", "often", "but", "not",
]);

export function contentWords(text: unknown): string[] {
  return asString(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOP_WORDS.has(w));
}

export function ngramSet(words: string[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i <= words.length - n; i += 1) {
    out.add(words.slice(i, i + n).join(" "));
  }
  return out;
}

// Concatenate every employee-facing briefing field (excludes brutal_truth_manager).
export function employeeFacingText(briefing: unknown): string {
  if (!isObjectRecord(briefing)) return "";
  const parts: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string") parts.push(v);
  };
  for (const [key, value] of Object.entries(briefing)) {
    if (MANAGER_ONLY_FIELDS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") push(item);
        else if (item && typeof item === "object") {
          push(asRecord(item).action);
          push(asRecord(item).meaning);
        }
      }
    } else {
      push(value);
    }
  }
  return parts.join("\n");
}

// Assertions of an internal employee state. Each entry is a word family so the
// anchor check can match morphology ("disengaged" anchors "disengagement").
export const STATE_ASSERTIONS: Array<{ label: string; re: RegExp }> = [
  { label: "disengagement", re: /\bdisengag\w*\b/i },
  { label: "burnout", re: /\bburn(?:ed|t|ing)[\s-]?out\b|\bburnout\b/i },
  { label: "checked out", re: /\bcheck(?:ed|ing)[\s-]?out\b/i },
  { label: "quiet quitting", re: /\bquiet[\s-]?quit\w*\b/i },
  { label: "flight risk", re: /\bflight[\s-]?risk\b/i },
  { label: "unreliable", re: /\bunreliab\w*\b/i },
  { label: "feedback avoidance", re: /\bavoid\w*\s+feedback\b|\bfeedback[\s-]?avoid\w*\b/i },
  { label: "low ownership", re: /\b(?:low|lacks?|lacking|no)\s+ownership\b/i },
  { label: "poor judgment", re: /\bpoor\s+judge?ment\b/i },
  { label: "demotivated", re: /\bdemotivat\w*\b|\bunmotivat\w*\b|\b(?:losing|lost)\s+(?:\w+\s+)?motivation\b/i },
  { label: "coasting", re: /\bcoasting\b/i },
  { label: "quitting risk", re: /\b(?:about|going|planning)\s+to\s+quit\b|\blooking\s+to\s+leave\b|\bone\s+foot\s+out\b/i },
];

// Manager-facing prose: the manager-only truth channel plus every
// engagement_read text field.
export function managerFacingText(briefing: unknown): string {
  const b = asRecord(briefing);
  const parts: string[] = [asString(b.brutal_truth_manager)];
  const er = asRecord(b.engagement_read);
  for (const value of Object.values(er)) {
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) parts.push(...value.filter((v): v is string => typeof v === "string"));
  }
  return parts.filter(Boolean).join("\n");
}

export function transcriptAnswerText(transcript: ReadonlyArray<TurnLike> | null | undefined): string {
  return (transcript || []).map((t) => asString(t.answer)).filter(Boolean).join("\n");
}

// INFERRED_STATE_LEAK — no output may assert an internal employee state the
// input doesn't carry. A state word the manager typed may appear in
// MANAGER-facing prose only; employee-facing text may never carry one unless the
// employee said it themselves in the session (self-authored text is the
// validated basis — prompt-improvement-spec §1).
export function checkInferredStateLeak(
  managerNotes: unknown,
  transcript: ReadonlyArray<TurnLike>,
  briefing: unknown,
): string[] {
  const failures: string[] = [];
  const notes = asString(managerNotes);
  const answers = transcriptAnswerText(transcript);
  const empText = employeeFacingText(briefing);
  const mgrText = managerFacingText(briefing);
  for (const s of STATE_ASSERTIONS) {
    if (empText && s.re.test(empText) && !s.re.test(answers)) {
      failures.push(`state assertion "${s.label}" in employee-facing output (allowed only when the employee said it themselves)`);
    }
    if (mgrText && s.re.test(mgrText) && !s.re.test(notes) && !s.re.test(answers)) {
      failures.push(`state assertion "${s.label}" in manager-facing output with no anchor in the manager's notes or the transcript`);
    }
  }
  return failures;
}

// PRIVATE_NOTE_LEAK — blatant tripwire. Splits the manager notes into clauses,
// keeps the ones that read as private judgment, and flags if any reuses a run of
// 2 content words verbatim in the employee-facing output. Will miss rewordings
// (those are the judge's job).
export function checkPrivateNoteLeak(managerNotes: unknown, briefing: unknown): { reason: string; detail: string } | null {
  const employeeText = employeeFacingText(briefing);
  if (!managerNotes || !employeeText) return null;

  const employeeGrams = ngramSet(contentWords(employeeText), 2);
  if (!employeeGrams.size) return null;

  const clauses = asString(managerNotes)
    .split(/[.;\n!?]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((c) => MARKER_RE.test(c));

  for (const clause of clauses) {
    const grams = ngramSet(contentWords(clause), 2);
    for (const g of grams) {
      if (employeeGrams.has(g)) {
        return { reason: PRIVATE_NOTE_LEAK, detail: `private judgment reused in employee-facing output: "${g}"` };
      }
    }
  }
  return null;
}

// Serve-time convenience: run both block-critical detectors over a produced
// briefing and report whether it must be blocked (swapped for a safe fallback)
// and why. Reason codes only — the detail is logged by the caller.
export interface LeakScreen {
  blocked: boolean;
  reasons: string[];
}
export function screenBriefingLeaks(
  managerNotes: unknown,
  transcript: ReadonlyArray<TurnLike> | null | undefined,
  briefing: unknown,
): LeakScreen {
  const reasons: string[] = [];
  const priv = checkPrivateNoteLeak(managerNotes, briefing);
  if (priv) reasons.push(priv.reason);
  if (checkInferredStateLeak(managerNotes, Array.isArray(transcript) ? transcript : [], briefing).length) {
    reasons.push(INFERRED_STATE_LEAK);
  }
  return { blocked: reasons.length > 0, reasons };
}
