// Pure render layer for the customer /prepare screen (prepare-variants).
// One brief, seven content slots, five switchable layouts — no DOM, no state,
// no fetch: every function here takes data in and returns an HTML string, so
// the whole file is testable under node:test (see preparation-brief.test.ts).
// The payload contract is PreparationResult["brief"] (backend/shared/session.types.ts).

import { escapeCopy } from "../../../admin/src/ui/html.js";
import { icon } from "../../../admin/src/ui/icon.js";
import { ArrowRight, Ban, Ear, Gauge, Lightbulb, MessageCircle, Target } from "lucide";

export type ConfidenceLevel = "low" | "medium" | "high" | "unknown";
export type VariantId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K";

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
}

// Alphabetical by label — this order is the dropdown order.
export const VARIANTS = [
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
} as const;

export function isVariantId(v: unknown): v is VariantId {
  return typeof v === "string" && v.length === 1 && v >= "A" && v <= "K";
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
      return `This brief is based on the role and meeting type only — you haven't added notes yet. Treat it as a starting point, not a read on ${who}.`;
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
    ${block(SLOT_LABELS.confidence, s.confidence)}
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
    ${row(SLOT_LABELS.confidence, para(s.confidence))}
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
    ${s.confidence ? cell("", `<p class="pv-g__confidence">${esc(s.confidence)}</p>`, "pv-g__cell--quiet") : ""}
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
    ${row(Gauge, SLOT_LABELS.confidence, para(s.confidence))}
    ${row(Lightbulb, SLOT_LABELS.theme, para(s.theme))}
    ${row(MessageCircle, SLOT_LABELS.opener, s.opener ? `<blockquote class="prep-callout">${esc(s.opener)}</blockquote>` : "")}
    ${row(Ear, SLOT_LABELS.listenFor, s.listenFor.length ? prepList(s.listenFor) : "")}
    ${row(Ban, SLOT_LABELS.dontAssume, s.dontAssume.length ? prepList(s.dontAssume) : "")}
    ${row(ArrowRight, SLOT_LABELS.yourMove, para(s.yourMove))}
    ${row(Target, SLOT_LABELS.leaveWith, para(s.leaveWith))}
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
};

export function renderBrief(variant: VariantId, slots: BriefSlots): string {
  return RENDERERS[variant](slots);
}

/* ---------------------------------------------------------------------------
   Page chrome shared across variants
--------------------------------------------------------------------------- */

export function ctaRowHtml(): string {
  return `<div class="l-cluster l-cluster--2 pt-2">
    <button class="btn js-continue">Generate 1:1 questions</button>
    <button type="button" class="btn btn--ghost js-copy-all-prep">Copy all</button>
    <button type="button" class="btn btn--ghost js-restart">New 1:1</button>
  </div>`;
}

export function variantSwitchHtml(current: VariantId): string {
  return `<label class="pv-switch">Layout
    <select class="js-variant">${VARIANTS.map(
      (v) => `<option value="${v.id}"${v.id === current ? " selected" : ""}>${v.label}</option>`,
    ).join("")}</select>
  </label>`;
}

/* ---------------------------------------------------------------------------
   Variant choice persistence — storage injected so tests need no browser
--------------------------------------------------------------------------- */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// "J" is the Contrast layout — the default for anyone without a saved choice.
const DEFAULT_VARIANT: VariantId = "J";

export function readVariant(storage: StorageLike | null | undefined): VariantId {
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
  const lines: string[] = ["Pre-meeting brief"];
  const who = [ctx?.name, ctx?.role, ctx?.seniority, ctx?.meetingType].filter(Boolean).join(" · ");
  if (who) lines.push(who);
  const notes = (ctx?.notes || "").trim();
  if (notes) lines.push("", "Context notes", notes);
  lines.push("");
  const rows: Array<[string, string | string[]]> = [
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
