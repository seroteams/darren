// Pure render layer for the customer /prepare screen (prepare-variants).
// One brief, seven content slots, twelve layouts: ONE customer default plus an
// admin-only layout lab (design-consolidation F8). No DOM, no state, no fetch:
// every function here takes data in and returns an HTML string, so the whole
// file is testable under node:test (see preparation-brief.test.ts).
// The payload contract is PreparationResult["brief"] (backend/shared/session.types.ts).

import { escapeCopy } from "../../../admin/src/ui/html.js";
import { icon } from "../../../admin/src/ui/icon.js";
import { wizardFooter } from "../../../admin/src/ui/wizard-footer.ts";
import { ArrowRight, Ban, Ear, Gauge, Lightbulb, MessageCircle, Target } from "lucide";

export type ConfidenceLevel = "low" | "medium" | "high" | "unknown";
export type VariantId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

// THE one customer-facing layout (design-consolidation F8, 2026-07-23):
// "H" is Sheet, the white memo. Carl can flip the whole product back to Arc
// with one word: change this to "L". Nothing else needs touching.
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

// Alphabetical by label — this order is the dropdown order.
export const VARIANTS = [
  { id: "L", label: "Arc" },
  { id: "G", label: "Bento" },
  { id: "J", label: "Contrast" },
  { id: "A", label: "Editorial" },
  { id: "C", label: "Native" },
  { id: "K", label: "Runner" },
  { id: "B", label: "Scan" },
  { id: "H", label: "Sheet" },
  { id: "I", label: "Split" },
  { id: "F", label: "Spotlight" },
  { id: "E", label: "Timed" },
  { id: "D", label: "Utility" },
] as const;

export const VARIANT_STORAGE_KEY = "sero.prepare.briefVariant";

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
   Shared markup helpers
--------------------------------------------------------------------------- */

const esc = escapeCopy;

function eyebrow(text: string, extra = ""): string {
  return `<div class="eyebrow${extra ? ` ${extra}` : ""}">${esc(text)}</div>`;
}

function prepList(items: string[]): string {
  return `<ul class="prep-list">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

// The Listen for / Don't assume pair — shared by variants B and E.
function pairHtml(s: BriefSlots): string {
  const cells = [
    s.listenFor.length ? `<div>${eyebrow(SLOT_LABELS.listenFor)}${prepList(s.listenFor)}</div>` : "",
    s.dontAssume.length ? `<div>${eyebrow(SLOT_LABELS.dontAssume)}${prepList(s.dontAssume)}</div>` : "",
  ].join("");
  return cells ? `<div class="pv-pair">${cells}</div>` : "";
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
function confMeter(level: ConfidenceLevel): string {
  if (level === "unknown") return "";
  const { lit, word } = CONF_STEPS[level];
  const dots = [0, 1, 2].map((i) => `<i${i < lit ? ' class="is-on"' : ""}></i>`).join("");
  return `<span class="conf conf--${level}" aria-label="Confidence: ${word.toLowerCase()}">
    <span class="conf__dots" aria-hidden="true">${dots}</span>
    <span class="conf__word">${word}</span>
  </span>`;
}

/* ---------------------------------------------------------------------------
   The five variants — same seven slots, one design direction each
--------------------------------------------------------------------------- */

// A "Editorial" — honesty leads: confidence sits under the title, larger than
// body text, no box. No cards; whitespace + small uppercase labels only.
function renderA(s: BriefSlots): string {
  const slot = (label: string, body: string) =>
    body ? `<div class="pv-a__slot">${eyebrow(label)}${body}</div>` : "";
  const para = (t: string) => (t ? `<p class="text-ink leading-relaxed">${esc(t)}</p>` : "");
  return `<div class="pv pv-a">
    ${confMeter(s.confidenceLevel)}
    ${s.confidence ? `<p class="pv-a__confidence">${esc(s.confidence)}</p>` : ""}
    ${slot(SLOT_LABELS.theme, para(s.theme))}
    ${s.opener ? `<div class="pv-a__slot">${eyebrow(SLOT_LABELS.opener)}<blockquote class="pv-a__opener">${esc(s.opener)}</blockquote></div>` : ""}
    ${s.listenFor.length ? slot(SLOT_LABELS.listenFor, prepList(s.listenFor)) : ""}
    ${s.dontAssume.length ? slot(SLOT_LABELS.dontAssume, prepList(s.dontAssume)) : ""}
    ${slot(SLOT_LABELS.yourMove, para(s.yourMove))}
    ${slot(SLOT_LABELS.leaveWith, para(s.leaveWith))}
  </div>`;
}

// B "Scan" — whole brief in ten seconds: opener hero, confidence strip,
// compact labelled rows, side-by-side lists.
function renderB(s: BriefSlots): string {
  const row = (label: string, text: string) =>
    text ? `<div class="pv-b__row">${eyebrow(label)}<p>${esc(text)}</p></div>` : "";
  return `<div class="pv pv-b">
    ${s.opener ? `<blockquote class="prep-callout">${esc(s.opener)}</blockquote>` : ""}
    ${confMeter(s.confidenceLevel)}
    ${s.confidence ? `<p class="pv-b__confidence">${esc(s.confidence)}</p>` : ""}
    ${row(SLOT_LABELS.theme, s.theme)}
    ${pairHtml(s)}
    ${row(SLOT_LABELS.yourMove, s.yourMove)}
    ${row(SLOT_LABELS.leaveWith, s.leaveWith)}
  </div>`;
}

// C "Native" — looks already shipped: the existing numbered-step timeline,
// callout, and list classes exactly as-is. No CSS of its own.
function renderC(s: BriefSlots): string {
  const steps: string[] = [];
  if (s.opener) steps.push(`<div class="prep-timeline__when">${esc(SLOT_LABELS.opener)}</div><blockquote class="prep-callout">${esc(s.opener)}</blockquote>`);
  if (s.listenFor.length) steps.push(`<div class="prep-timeline__when">${esc(SLOT_LABELS.listenFor)}</div>${prepList(s.listenFor)}`);
  if (s.dontAssume.length) steps.push(`<div class="prep-timeline__when">${esc(SLOT_LABELS.dontAssume)}</div>${prepList(s.dontAssume)}`);
  if (s.yourMove) steps.push(`<div class="prep-timeline__when">${esc(SLOT_LABELS.yourMove)}</div><p class="text-ink leading-relaxed">${esc(s.yourMove)}</p>`);
  const block = (label: string, text: string) =>
    text ? `<div>${eyebrow(label, "mb-2")}<p class="text-ink leading-relaxed">${esc(text)}</p></div>` : "";
  return `<div class="pv pv-c space-y-6">
    ${s.confidence ? `<div>${eyebrow(SLOT_LABELS.confidence, "mb-2")}${confMeter(s.confidenceLevel)}<p class="text-ink leading-relaxed">${esc(s.confidence)}</p></div>` : ""}
    ${block(SLOT_LABELS.theme, s.theme)}
    ${steps.length ? `<ol class="prep-timeline">${steps.map((body, i) => `
      <li class="prep-timeline__step">
        <div class="prep-timeline__num">${i + 1}</div>
        <div class="prep-timeline__body">${body}</div>
      </li>`).join("")}</ol>` : ""}
    ${block(SLOT_LABELS.leaveWith, s.leaveWith)}
  </div>`;
}

// D "Utility" — zero chrome, print-friendly: one flat label + content list,
// hairline separators, single accent use (the opener text).
function renderD(s: BriefSlots): string {
  const row = (label: string, body: string) =>
    body ? `<div class="pv-d__row">${eyebrow(label)}<div class="pv-d__value">${body}</div></div>` : "";
  const para = (t: string, cls = "") => (t ? `<p${cls ? ` class="${cls}"` : ""}>${esc(t)}</p>` : "");
  const list = (items: string[]) =>
    items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "";
  return `<div class="pv pv-d">
    ${row(SLOT_LABELS.confidence, `${confMeter(s.confidenceLevel)}${para(s.confidence)}`)}
    ${row(SLOT_LABELS.theme, para(s.theme))}
    ${row(SLOT_LABELS.opener, para(s.opener, "pv-d__opener"))}
    ${row(SLOT_LABELS.listenFor, list(s.listenFor))}
    ${row(SLOT_LABELS.dontAssume, list(s.dontAssume))}
    ${row(SLOT_LABELS.yourMove, para(s.yourMove))}
    ${row(SLOT_LABELS.leaveWith, para(s.leaveWith))}
  </div>`;
}

// E "Timed" — visual weight = reading order: the minimum viable brief on top
// (confidence, opener, leave-with), supporting detail below a hairline.
function renderE(s: BriefSlots): string {
  const topSlot = (label: string, text: string, cls: string) =>
    text ? `<div class="pv-e__slot">${eyebrow(label)}<p class="${cls}">${esc(text)}</p></div>` : "";
  const lowSlot = (label: string, text: string) =>
    text ? `<div class="pv-e__slot">${eyebrow(label)}<p>${esc(text)}</p></div>` : "";
  return `<div class="pv pv-e">
    <div class="pv-e__top">
      ${confMeter(s.confidenceLevel)}
      ${s.confidence ? `<p class="pv-e__lead">${esc(s.confidence)}</p>` : ""}
      ${topSlot(SLOT_LABELS.opener, s.opener, "pv-e__lead pv-e__opener")}
      ${topSlot(SLOT_LABELS.leaveWith, s.leaveWith, "pv-e__lead")}
    </div>
    <div class="pv-e__low">
      ${lowSlot(SLOT_LABELS.theme, s.theme)}
      ${pairHtml(s)}
      ${lowSlot(SLOT_LABELS.yourMove, s.yourMove)}
    </div>
  </div>`;
}

// F "Spotlight" — poster: the opener is the page, set in the display face and
// centred; confidence sits directly beneath it; support in quiet columns below.
function renderF(s: BriefSlots): string {
  const col = (label: string, body: string) =>
    body ? `<div class="pv-f__col">${eyebrow(label)}${body}</div>` : "";
  const para = (t: string) => (t ? `<p>${esc(t)}</p>` : "");
  return `<div class="pv pv-f">
    <div class="pv-f__stagezone">
      ${s.opener ? `${eyebrow(SLOT_LABELS.opener)}<p class="pv-f__opener">${esc(s.opener)}</p>` : ""}
      ${confMeter(s.confidenceLevel)}
      ${s.confidence ? `<p class="pv-f__confidence">${esc(s.confidence)}</p>` : ""}
    </div>
    <div class="pv-f__grid">
      ${col(SLOT_LABELS.theme, para(s.theme))}
      ${s.listenFor.length ? col(SLOT_LABELS.listenFor, prepList(s.listenFor)) : ""}
      ${s.dontAssume.length ? col(SLOT_LABELS.dontAssume, prepList(s.dontAssume)) : ""}
    </div>
    <div class="pv-f__grid pv-f__grid--two">
      ${col(SLOT_LABELS.yourMove, para(s.yourMove))}
      ${col(SLOT_LABELS.leaveWith, para(s.leaveWith))}
    </div>
  </div>`;
}

// G "Bento" — varied-size card grid: the opener card is tinted and double
// width, lists get list cards, action row runs wide. Sizes vary on purpose.
function renderG(s: BriefSlots): string {
  const cell = (label: string, body: string, mod = "") =>
    body ? `<div class="pv-g__cell${mod ? ` ${mod}` : ""}">${label ? eyebrow(label) : ""}${body}</div>` : "";
  const para = (t: string) => (t ? `<p>${esc(t)}</p>` : "");
  return `<div class="pv pv-g">
    ${s.opener ? cell(SLOT_LABELS.opener, `<p class="pv-g__opener">${esc(s.opener)}</p>`, "pv-g__cell--opener") : ""}
    ${s.confidence ? cell("", `${confMeter(s.confidenceLevel)}<p class="pv-g__confidence">${esc(s.confidence)}</p>`, "pv-g__cell--quiet") : ""}
    ${cell(SLOT_LABELS.theme, para(s.theme))}
    ${s.listenFor.length ? cell(SLOT_LABELS.listenFor, prepList(s.listenFor)) : ""}
    ${s.dontAssume.length ? cell(SLOT_LABELS.dontAssume, prepList(s.dontAssume)) : ""}
    ${cell(SLOT_LABELS.yourMove, para(s.yourMove), "pv-g__cell--wide")}
    ${cell(SLOT_LABELS.leaveWith, para(s.leaveWith))}
  </div>`;
}

// H "Sheet" — a single paper memo on the tinted page: one white sheet,
// generous margins, one reading column, hairline rules between sections.
function renderH(s: BriefSlots): string {
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

// I "Split" — workspace: a soft context rail (confidence, theme, leave-with)
// beside the working column (opener, lists, your move).
function renderI(s: BriefSlots): string {
  const slot = (label: string, body: string) =>
    body ? `<div class="pv-i__slot">${eyebrow(label)}${body}</div>` : "";
  const para = (t: string) => (t ? `<p>${esc(t)}</p>` : "");
  return `<div class="pv pv-i">
    <aside class="pv-i__side">
      ${confMeter(s.confidenceLevel)}
      ${s.confidence ? `<p class="pv-i__confidence">${esc(s.confidence)}</p>` : ""}
      ${slot(SLOT_LABELS.theme, para(s.theme))}
      ${slot(SLOT_LABELS.leaveWith, para(s.leaveWith))}
    </aside>
    <div class="pv-i__main">
      ${s.opener ? `<div class="pv-i__slot">${eyebrow(SLOT_LABELS.opener)}<blockquote class="prep-callout">${esc(s.opener)}</blockquote></div>` : ""}
      ${s.listenFor.length ? slot(SLOT_LABELS.listenFor, prepList(s.listenFor)) : ""}
      ${s.dontAssume.length ? slot(SLOT_LABELS.dontAssume, prepList(s.dontAssume)) : ""}
      ${slot(SLOT_LABELS.yourMove, para(s.yourMove))}
    </div>
  </div>`;
}

// J "Contrast" — one committed colour move: a deep navy band carries the
// confidence and opener in off-white; everything else stays calm on white.
function renderJ(s: BriefSlots): string {
  const row = (label: string, body: string) =>
    body ? `<div class="pv-j__slot">${eyebrow(label)}${body}</div>` : "";
  const para = (t: string) => (t ? `<p>${esc(t)}</p>` : "");
  return `<div class="pv pv-j">
    <div class="pv-j__band">
      ${confMeter(s.confidenceLevel)}
      ${s.confidence ? `<p class="pv-j__confidence">${esc(s.confidence)}</p>` : ""}
      ${s.opener ? `${eyebrow(SLOT_LABELS.opener, "pv-j__eyebrow")}<p class="pv-j__opener">${esc(s.opener)}</p>` : ""}
    </div>
    ${row(SLOT_LABELS.theme, para(s.theme))}
    ${pairHtml(s)}
    ${row(SLOT_LABELS.yourMove, para(s.yourMove))}
    ${row(SLOT_LABELS.leaveWith, para(s.leaveWith))}
  </div>`;
}

// K "Runner" — from Carl's runner mock: one contained
// card, a row per slot with a round icon chip and uppercase label, hairline
// dividers, the opener in the tinted callout. Icons via the shared Lucide
// helper (DESIGN.md §5); chips use the accent-soft/accent-dark pairing.
function renderK(s: BriefSlots): string {
  const row = (glyph: unknown, label: string, body: string) =>
    body
      ? `<div class="pv-k__row">
          <div class="pv-k__icon">${icon(glyph as never, { size: 20 })}</div>
          <div class="pv-k__body">${eyebrow(label)}${body}</div>
        </div>`
      : "";
  const para = (t: string) => (t ? `<p>${esc(t)}</p>` : "");
  return `<div class="pv pv-k">
    ${row(Gauge, SLOT_LABELS.confidence, `${confMeter(s.confidenceLevel)}${para(s.confidence)}`)}
    ${row(Lightbulb, SLOT_LABELS.theme, para(s.theme))}
    ${row(MessageCircle, SLOT_LABELS.opener, s.opener ? `<blockquote class="prep-callout">${esc(s.opener)}</blockquote>` : "")}
    ${row(Ear, SLOT_LABELS.listenFor, s.listenFor.length ? prepList(s.listenFor) : "")}
    ${row(Ban, SLOT_LABELS.dontAssume, s.dontAssume.length ? prepList(s.dontAssume) : "")}
    ${row(ArrowRight, SLOT_LABELS.yourMove, para(s.yourMove))}
    ${row(Target, SLOT_LABELS.leaveWith, para(s.leaveWith))}
  </div>`;
}

// L "Arc" — Before · During · After, led by a dark highlight header. The likely
// theme + confidence sit in a deep band up top (the one thing to walk in
// knowing); the three phases follow. On desktop they stack down a spine; on
// phones they collapse behind a Before/During/After segmented control so the
// screen never becomes a wall of text. Accent family + the shared navy band.
function renderL(s: BriefSlots): string {
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

const RENDERERS: Record<VariantId, (s: BriefSlots) => string> = {
  A: renderA,
  B: renderB,
  C: renderC,
  D: renderD,
  E: renderE,
  F: renderF,
  G: renderG,
  H: renderH,
  I: renderI,
  J: renderJ,
  K: renderK,
  L: renderL,
};

export function renderBrief(variant: VariantId, slots: BriefSlots): string {
  return RENDERERS[variant](slots);
}

/* ---------------------------------------------------------------------------
   Page chrome shared across variants
--------------------------------------------------------------------------- */

// The shared wizard footer (design-consolidation Phase 3): ghost Back left
// (returns to Focus areas — wired in preparation.ts), primary right, Copy all
// as a trusted ghost beside it.
export function ctaRowHtml(): string {
  return wizardFooter({
    primary: { label: "Get my questions" },
    back: {},
    secondaryHtml: `<button type="button" class="btn btn--ghost js-copy-all-prep">Copy all</button>`,
  });
}

// Tiny schematic per layout — echoes each layout's signature so a tile looks
// like the layout it switches to. Structure only; every colour lives in
// preparation.css (token-gated), never inline.
const tbar = (w: string, dim = false) => `<i class="pv-tb${dim ? " pv-tb--dim" : ""}" style="width:${w}"></i>`;
const PV_THUMB: Record<VariantId, string> = {
  A: `<span class="pv-thmb pv-thmb--stack">${tbar("40%", true)}${tbar("90%")}<b class="pv-tblk"></b>${tbar("80%")}${tbar("60%")}</span>`,
  B: `<span class="pv-thmb pv-thmb--stack"><b class="pv-tblk pv-tblk--wide"></b>${tbar("30%", true)}${tbar("85%")}<span class="pv-trow"><i></i><i></i></span></span>`,
  C: `<span class="pv-thmb pv-thmb--time"><span class="pv-tstep"><s class="pv-tdot"></s>${tbar("70%")}</span><span class="pv-tstep"><s class="pv-tdot"></s>${tbar("60%")}</span><span class="pv-tstep"><s class="pv-tdot"></s>${tbar("65%")}</span></span>`,
  D: `<span class="pv-thmb pv-thmb--flat">${tbar("70%")}${tbar("100%", true)}${tbar("80%")}${tbar("100%", true)}${tbar("60%")}</span>`,
  E: `<span class="pv-thmb pv-thmb--stack"><b class="pv-tblk pv-tblk--tall"></b><hr class="pv-thr">${tbar("70%", true)}${tbar("85%")}</span>`,
  F: `<span class="pv-thmb pv-thmb--hero"><b class="pv-tblk pv-tblk--hero"></b>${tbar("40%", true)}<span class="pv-trow pv-trow--3"><i></i><i></i><i></i></span></span>`,
  G: `<span class="pv-thmb pv-thmb--bento"><b class="pv-tblk pv-tblk--span2"></b><i></i><i></i><i></i><b class="pv-tblk pv-tblk--span2 pv-tblk--short"></b></span>`,
  H: `<span class="pv-thmb pv-thmb--sheet"><span class="pv-tpaper">${tbar("30%", true)}${tbar("85%")}${tbar("70%")}${tbar("80%")}</span></span>`,
  I: `<span class="pv-thmb pv-thmb--split"><span class="pv-trail">${tbar("70%")}${tbar("60%")}</span><span class="pv-tcol">${tbar("90%")}${tbar("80%")}${tbar("70%")}</span></span>`,
  J: `<span class="pv-thmb pv-thmb--contrast"><b class="pv-tband"></b>${tbar("85%")}<span class="pv-trow"><i></i><i></i></span></span>`,
  K: `<span class="pv-thmb pv-thmb--runner"><span class="pv-tkrow"><u></u>${tbar("70%")}</span><span class="pv-tkrow"><u></u>${tbar("60%")}</span><span class="pv-tkrow"><u></u>${tbar("65%")}</span></span>`,
  L: `<span class="pv-thmb pv-thmb--arc"><span class="pv-tarc"><s></s>${tbar("60%")}</span><span class="pv-tarc"><s></s>${tbar("80%")}</span><span class="pv-tarc"><s></s>${tbar("50%")}</span></span>`,
};

// The layout switcher: a quiet trigger chip showing the current layout; clicking
// it opens a fixed-width popover of preview tiles. Wiring (open/close/select,
// click-away, Esc) lives in preparation.ts.
export function variantSwitchHtml(current: VariantId): string {
  const currentLabel = VARIANTS.find((v) => v.id === current)?.label ?? "";
  const tiles = VARIANTS.map((v) => {
    const on = v.id === current;
    return `<button type="button" role="menuitemradio" class="pv-tile js-variant-tile${on ? " is-active" : ""}" data-id="${v.id}" aria-checked="${on}" title="${v.label}">
        ${PV_THUMB[v.id]}
        <span class="pv-tile__name">${v.label}</span>
      </button>`;
  }).join("");
  return `<div class="pv-switch js-variant-switch">
    <button type="button" class="pv-switch__trigger js-variant-trigger" aria-haspopup="true" aria-expanded="false">
      <span class="pv-switch__label">Layout</span>
      <span class="pv-switch__value js-variant-value">${currentLabel}</span>
      <span class="pv-switch__chev" aria-hidden="true">▾</span>
    </button>
    <div class="pv-switch__pop js-variant-pop" role="menu" aria-label="Choose a layout">
      <div class="pv-switch__poptitle">Choose a layout</div>
      <div class="pv-switch__grid">${tiles}</div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------------------------
   Variant choice persistence — storage injected so tests need no browser
--------------------------------------------------------------------------- */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// The layout lab is admin-only: only when adminLab is true does the stored
// choice count. Everyone else gets DEFAULT_VARIANT — a stored non-default
// layout for a non-admin (saved before the fence, or by an admin on a shared
// browser) silently falls back rather than leaking a lab layout. The flag
// defaults to false so a forgotten call site fails safe, to the customer view.
export function readVariant(storage: StorageLike | null | undefined, adminLab = false): VariantId {
  if (!adminLab) return DEFAULT_VARIANT;
  try {
    const v = storage ? storage.getItem(VARIANT_STORAGE_KEY) : null;
    return isVariantId(v) ? v : DEFAULT_VARIANT;
  } catch {
    return DEFAULT_VARIANT;
  }
}

export function writeVariant(storage: StorageLike | null | undefined, v: VariantId): void {
  try {
    storage?.setItem(VARIANT_STORAGE_KEY, v);
  } catch {
    /* storage blocked — the default carries the session */
  }
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
