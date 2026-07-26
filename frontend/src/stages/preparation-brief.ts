// Pure render layer for the customer /prepare screen (prepare-variants).
// One brief, seven content slots, ONE customer layout (renderH "Sheet"). The
// 11 other layouts + the switcher live in preparation-lab.ts, an admin-only
// module the customer bundle never downloads (refactor-2026-07 P4): the /prepare
// stage dynamic-imports it only for internal admins. No DOM, no state, no fetch:
// every function here takes data in and returns an HTML string, so the whole
// file is testable under node:test (see preparation-brief.test.ts).
// The payload contract is PreparationResult["brief"] (backend/shared/session.types.ts).

import { escapeCopy } from "../../../admin/src/ui/html.js";
import { wizardFooter } from "../../../admin/src/ui/wizard-footer.ts";
import { button } from "../../../admin/src/ui/button.ts";

export type ConfidenceLevel = "low" | "medium" | "high" | "unknown";
export type VariantId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

// THE one customer-facing layout (design-consolidation F8, 2026-07-23):
// "H" is Sheet, the white memo. Flipping the product back to Arc = move renderL
// back here from preparation-lab.ts and point renderDefaultBrief (and this id)
// at it — one small move, nothing else needs touching.
export const DEFAULT_VARIANT: VariantId = "H";

// Defensive mirror of the backend brief shape — the store value is untyped.
export interface PrepBrief {
  coreIssue?: string;
  openingQuestion?: string;
  listenFor?: string[];
  avoid?: string[];
  goodOutcome?: string;
  suggestedAction?: string;
  confidence?: string;
  dontAssume?: string;
  styleTip?: string;
}

// The seven content slots every variant renders — same data, no slot added,
// invented, or omitted (prepare-variants content contract).
export interface BriefSlots {
  confidence: string; // rewritten plain-language statement (or the raw sentence when the level is unreadable)
  confidenceLevel: ConfidenceLevel;
  theme: string; // coreIssue
  opener: string; // openingQuestion
  listenFor: string[]; // max 3
  dontAssume: string[]; // dontAssume + avoid, merged
  yourMove: string; // suggestedAction — a during-the-meeting move
  leaveWith: string; // goodOutcome
  styleTip: string; // how to run this style of meeting (empty string when absent)
}

// Plain manager labels. Each renders at most once per page — the no-duplicate
// rule covers labels as well as content.
export const SLOT_LABELS = {
  confidence: "How sure is this",
  theme: "Likely theme",
  opener: "Open with",
  listenFor: "Listen for",
  dontAssume: "Don't assume",
  yourMove: "During the 1:1",
  leaveWith: "Aim to leave with",
  styleTip: "For this kind of 1:1",
} as const;

export function isVariantId(v: unknown): v is VariantId {
  return typeof v === "string" && v.length === 1 && v >= "A" && v <= "L";
}

// The engine guarantees brief.confidence starts with Low/Medium/High
// (validateBrief in the engine); anything else is surfaced raw, never masked.
export function parseConfidenceLevel(raw: string): ConfidenceLevel {
  const m = /^\s*(low|medium|high)\b/i.exec(raw || "");
  const word = m && m[1] ? m[1].toLowerCase() : "";
  return word === "low" || word === "medium" || word === "high" ? word : "unknown";
}

// Exact copy fixed by the prepare-variants spec — applied at render only, the
// stored payload keeps the engine's own sentence.
export function confidenceCopy(raw: string, name: string): string {
  const who = (name || "").trim() || "them";
  switch (parseConfidenceLevel(raw)) {
    case "low":
      return `This brief is based on the role and 1:1 type only. You haven't added notes yet. Treat it as a starting point; it says nothing about ${who} personally.`;
    case "medium":
      return "This brief uses your notes plus role defaults. The more specific parts come from what you wrote.";
    case "high":
      return "This brief is grounded in your notes and recent context.";
    default:
      return (raw || "").trim();
  }
}

function clean(v: unknown): string {
  return String(v ?? "").trim();
}

export function extractSlots(brief: PrepBrief, name: string): BriefSlots {
  const rawConfidence = clean(brief.confidence);
  // Merge "don't assume yet" + "avoid" into one list; dedupe so a warning the
  // engine repeated across both fields can't render twice.
  const dontAssume = [
    ...new Set([clean(brief.dontAssume), ...(brief.avoid || []).map(clean)].filter(Boolean)),
  ];
  return {
    confidence: confidenceCopy(rawConfidence, name),
    confidenceLevel: parseConfidenceLevel(rawConfidence),
    theme: clean(brief.coreIssue),
    opener: clean(brief.openingQuestion),
    listenFor: (brief.listenFor || []).map(clean).filter(Boolean).slice(0, 3),
    dontAssume,
    yourMove: clean(brief.suggestedAction),
    leaveWith: clean(brief.goodOutcome),
    styleTip: clean(brief.styleTip),
  };
}

/* ---------------------------------------------------------------------------
   Shared markup helpers — exported: preparation-lab.ts's renderers reuse them
--------------------------------------------------------------------------- */

const esc = escapeCopy;

export function eyebrow(text: string, extra = ""): string {
  return `<div class="eyebrow${extra ? ` ${extra}` : ""}">${esc(text)}</div>`;
}

export function prepList(items: string[]): string {
  return `<ul class="prep-list">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

// Confidence dot-meter — the artifact's at-a-glance "how sure is this" motif: a
// small pill with three dots, N lit by level. It sits ALONGSIDE the plain
// sentence, never in place of it (engine honesty — the words that explain the
// reading always stay). An unreadable level shows no meter, only the sentence,
// so we never paint a false reading.
const CONF_STEPS: Record<Exclude<ConfidenceLevel, "unknown">, { lit: number; word: string }> = {
  low: { lit: 1, word: "Low" },
  medium: { lit: 2, word: "Medium" },
  high: { lit: 3, word: "High" },
};
export function confMeter(level: ConfidenceLevel): string {
  if (level === "unknown") return "";
  const { lit, word } = CONF_STEPS[level];
  const dots = [0, 1, 2].map((i) => `<i${i < lit ? ' class="is-on"' : ""}></i>`).join("");
  return `<span class="conf conf--${level}" aria-label="Confidence: ${word.toLowerCase()}">
    <span class="conf__dots" aria-hidden="true">${dots}</span>
    <span class="conf__word">${word}</span>
  </span>`;
}

/* ---------------------------------------------------------------------------
   The customer layout — the 11 lab layouts live in preparation-lab.ts
--------------------------------------------------------------------------- */

// H "Sheet" — a single paper memo on the tinted page: one white sheet,
// generous margins, one reading column, hairline rules between sections.
export function renderH(s: BriefSlots): string {
  const section = (label: string, body: string) =>
    body ? `<div class="pv-h__section">${eyebrow(label)}${body}</div>` : "";
  const para = (t: string) => (t ? `<p>${esc(t)}</p>` : "");
  return `<div class="pv pv-h">
    ${confMeter(s.confidenceLevel)}
    ${s.confidence ? `<p class="pv-h__confidence">${esc(s.confidence)}</p>` : ""}
    ${section(SLOT_LABELS.theme, para(s.theme))}
    ${s.opener ? `<div class="pv-h__section">${eyebrow(SLOT_LABELS.opener)}<p class="pv-h__opener">${esc(s.opener)}</p></div>` : ""}
    ${s.listenFor.length ? section(SLOT_LABELS.listenFor, prepList(s.listenFor)) : ""}
    ${s.dontAssume.length ? section(SLOT_LABELS.dontAssume, prepList(s.dontAssume)) : ""}
    ${section(SLOT_LABELS.yourMove, para(s.yourMove))}
    ${section(SLOT_LABELS.leaveWith, para(s.leaveWith))}
  </div>`;
}

// The customer render: the DEFAULT_VARIANT layout, statically bundled. The lab
// (preparation-lab.ts) renders every other layout for internal admins.
export function renderDefaultBrief(s: BriefSlots): string {
  return renderH(s);
}

/* ---------------------------------------------------------------------------
   Page chrome
--------------------------------------------------------------------------- */

// The shared wizard footer (design-consolidation Phase 3): ghost Back left
// (returns to Focus areas — wired in preparation.ts), primary right, Copy brief
// as a trusted ghost beside it.
export function ctaRowHtml(): string {
  return wizardFooter({
    primary: { label: "Start 1:1 questions" },
    back: {},
    secondaryHtml: button({ label: "Copy brief", variant: "ghost", hook: "js-copy-all-prep" }),
  });
}

/* ---------------------------------------------------------------------------
   Copy all — built from the same slots the screen renders, so clipboard and
   page always agree
--------------------------------------------------------------------------- */

export interface CopyCtx {
  name?: string;
  role?: string;
  seniority?: string;
  meetingType?: string;
  notes?: string;
}

export function formatBriefForCopy(slots: BriefSlots, ctx: CopyCtx | null | undefined): string {
  const lines: string[] = ["Prep brief"];
  const who = [ctx?.name, ctx?.role, ctx?.seniority, ctx?.meetingType].filter(Boolean).join(" · ");
  if (who) lines.push(who);
  const notes = (ctx?.notes || "").trim();
  if (notes) lines.push("", "Context notes", notes);
  lines.push("");
  const rows: Array<[string, string | string[]]> = [
    [SLOT_LABELS.styleTip, slots.styleTip],
    [SLOT_LABELS.confidence, slots.confidence],
    [SLOT_LABELS.theme, slots.theme],
    [SLOT_LABELS.opener, slots.opener],
    [SLOT_LABELS.listenFor, slots.listenFor],
    [SLOT_LABELS.dontAssume, slots.dontAssume],
    [SLOT_LABELS.yourMove, slots.yourMove],
    [SLOT_LABELS.leaveWith, slots.leaveWith],
  ];
  for (const [label, value] of rows) {
    if (Array.isArray(value) ? !value.length : !value.trim()) continue;
    lines.push(label);
    if (Array.isArray(value)) value.forEach((item) => lines.push(`- ${item}`));
    else lines.push(value.trim());
    lines.push("");
  }
  return lines.join("\n").trim();
}
