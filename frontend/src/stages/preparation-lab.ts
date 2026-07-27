// The /prepare layout lab (design-consolidation F8) — managers and admins.
// The 11 non-default layouts, the switcher chip + tile popover, and the stored
// layout choice. Split out of preparation-brief.ts (refactor-2026-07 P4) so the
// guest/member bundle never downloads any of it: preparation.ts dynamic-imports
// this module only for signed-in managers and admins, and Vite splits it (plus
// preparation-lab.css, dynamic-imported beside it in preparation.ts — NOT here,
// so node:test can import this module without a CSS loader) into async chunks.
// Same rules as the brief module: pure HTML-string renderers, no DOM, no state,
// no fetch — preparation-brief.test.ts covers every variant through renderBrief.

import { escapeCopy } from "../../../admin/src/ui/html.js";
import { icon } from "../../../admin/src/ui/icon.js";
import { ArrowRight, Ban, Ear, Gauge, Lightbulb, MessageCircle, Target } from "lucide";
import {
  DEFAULT_VARIANT,
  SLOT_LABELS,
  confMeter,
  eyebrow,
  isVariantId,
  pairHtml,
  prepList,
  renderH,
  renderL,
  type BriefSlots,
  type VariantId,
} from "./preparation-brief.ts";

const esc = escapeCopy;

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

/* ---------------------------------------------------------------------------
   The 11 lab variants — same seven slots, one design direction each
   (L "Arc", the default layout, lives in preparation-brief.ts)
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
   The layout switcher
--------------------------------------------------------------------------- */

// Tiny schematic per layout — echoes each layout's signature so a tile looks
// like the layout it switches to. Structure only; every colour lives in
// preparation-lab.css (token-gated), never inline.
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

// The picker belongs to managers and admins: only when canPick is true does the
// stored choice count. Everyone else (guests, members) gets DEFAULT_VARIANT — a
// stored non-default layout on a shared browser silently falls back rather than
// leaking a lab layout. The flag defaults to false so a forgotten call site
// fails safe, to the default view.
export function readVariant(storage: StorageLike | null | undefined, canPick = false): VariantId {
  if (!canPick) return DEFAULT_VARIANT;
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
