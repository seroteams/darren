// Pure render layer for the customer /prepare screen (prepare-variants).
// One brief, seven content slots, ONE default layout (renderL "Arc"). The
// 11 other layouts + the switcher live in preparation-lab.ts, a module the
// guest/member bundle never downloads (refactor-2026-07 P4): the /prepare
// stage dynamic-imports it only for managers and admins. No DOM, no state, no fetch:
// every function here takes data in and returns an HTML string, so the whole
// file is testable under node:test (see preparation-brief.test.ts).
// The payload contract is PreparationResult["brief"] (backend/shared/session.types.ts).

import { escapeCopy } from "../../../admin/src/ui/html.js";
import { wizardFooter } from "../../../admin/src/ui/wizard-footer.ts";
import { button } from "../../../admin/src/ui/button.ts";

export type ConfidenceLevel = "low" | "medium" | "high" | "unknown";
export type VariantId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

// THE default layout (2026-07-27): "L" is Arc, the Before/During/After spine
// under a dark theme band. It is what every viewer gets until a manager or
// admin picks another in the layout switcher. Flipping the default = move that
// variant's renderer back here from preparation-lab.ts and point
// renderDefaultBrief (and this id) at it, plus its CSS block.
export const DEFAULT_VARIANT: VariantId = "L";

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
   The default layout — the 11 other layouts live in preparation-lab.ts
--------------------------------------------------------------------------- */

// The Listen for / Don't assume pair — shared by L here and by B, E, J in the lab.
export function pairHtml(s: BriefSlots): string {
  const cells = [
    s.listenFor.length ? `<div>${eyebrow(SLOT_LABELS.listenFor)}${prepList(s.listenFor)}</div>` : "",
    s.dontAssume.length ? `<div>${eyebrow(SLOT_LABELS.dontAssume)}${prepList(s.dontAssume)}</div>` : "",
  ].join("");
  return cells ? `<div class="pv-pair">${cells}</div>` : "";
}

// L "Arc" — Before · During · After, led by a dark highlight header. The likely
// theme + confidence sit in a deep band up top (the one thing to walk in
// knowing); the three phases follow. On desktop they stack down a spine; on
// phones they collapse behind a Before/During/After segmented control so the
// screen never becomes a wall of text. Accent family + the shared navy band.
// The tab wiring lives in preparation.ts (wireArcTabs).
export function renderL(s: BriefSlots): string {
  const mini = (label: string, body: string) =>
    body ? `<div class="pv-l__mini">${eyebrow(label)}${body}</div>` : "";
  const para = (t: string) => (t ? `<p class="text-ink leading-relaxed">${esc(t)}</p>` : "");
  const tip = s.styleTip
    ? `<div class="pv-l__tip">${eyebrow(SLOT_LABELS.styleTip)}<p>${esc(s.styleTip)}</p></div>`
    : "";
  // Dark highlight header — the likely theme, with the confidence meter as an
  // at-a-glance read. Skipped whole if there's nothing to carry.
  const heroInner = [
    s.theme
      ? `${eyebrow(SLOT_LABELS.theme, "pv-l__hero-eyebrow")}<p class="pv-l__hero-theme">${esc(s.theme)}</p>`
      : "",
    confMeter(s.confidenceLevel),
  ].join("");
  const hero = heroInner ? `<div class="pv-l__hero">${heroInner}</div>` : "";

  const before = [
    tip,
    s.confidence ? `<p class="pv-l__confidence">${esc(s.confidence)}</p>` : "",
  ].join("");
  const during = [
    s.opener ? `<blockquote class="prep-callout">${esc(s.opener)}</blockquote>` : "",
    pairHtml(s),
    mini(SLOT_LABELS.yourMove, para(s.yourMove)),
  ].join("");
  const after = mini(SLOT_LABELS.leaveWith, para(s.leaveWith));

  // Each phase is both a spine node (desktop) and a tab pane (mobile). Only
  // phases with content render; the first present one is active by default.
  const phases = [
    { id: "before", tab: "Before", name: "Before you walk in", sub: "the read", body: before, mod: "" },
    { id: "during", tab: "During", name: "In the room", sub: "the moves", body: during, mod: "" },
    { id: "after", tab: "After", name: "Leave with", sub: "the goal", body: after, mod: "pv-l__phase--after" },
  ].filter((p) => p.body);
  const activeId = phases.length ? phases[0]!.id : "";

  const tabs = phases.length
    ? `<div class="pv-l__tabs" role="tablist" aria-label="1:1 stages">${phases
        .map(
          (p) =>
            `<button type="button" class="pv-l__tab${p.id === activeId ? " is-active" : ""}" role="tab" data-pane="${p.id}" aria-selected="${p.id === activeId}">${esc(p.tab)}</button>`,
        )
        .join("")}</div>`
    : "";

  const phaseHtml = phases
    .map(
      (p) =>
        `<div class="pv-l__phase${p.mod ? ` ${p.mod}` : ""}${p.id === activeId ? " is-active" : ""}" data-pane="${p.id}">
          <span class="pv-l__dot" aria-hidden="true"></span>
          <div class="pv-l__head"><span class="pv-l__name">${esc(p.name)}</span><span class="pv-l__sub">${esc(p.sub)}</span></div>
          <div class="pv-l__body">${p.body}</div>
        </div>`,
    )
    .join("");

  return `<div class="pv pv-l">
    ${hero}
    ${tabs}
    ${phaseHtml}
  </div>`;
}

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

// The default render: the DEFAULT_VARIANT layout, statically bundled. The lab
// (preparation-lab.ts) renders every other layout for managers and admins.
export function renderDefaultBrief(s: BriefSlots): string {
  return renderL(s);
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

// The one-tap score on the brief (brief-star-rating). Rendered here rather than
// inside a variant renderer so all 12 layouts get it from one place, and sits
// between the brief and the footer — never inside the button row. The stars
// themselves are appended by preparation.ts (createStarRating owns that DOM);
// this only lays out the question, the host, and the status line.
export function briefRatingHtml(): string {
  return `
    <section class="pv-rate card-flat">
      <p class="pv-rate__q" id="pv-rate-q">How good is this brief?</p>
      <div class="pv-rate__right">
        <div class="pv-rate__stars js-brief-rating-host"></div>
        <span class="pv-rate__status js-brief-rating-status" role="status" aria-live="polite"></span>
      </div>
    </section>`;
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
