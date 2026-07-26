// The skeleton preset catalogue — the ONE place that knows what Sero's screens
// look like, so no stage ever hand-rolls its own loading markup again.
//
// Each preset renders a ghost of a real layout using that layout's REAL classes:
// the list preset builds an actual `.run-list--card > .run-list__item >
// .run-list__row`, so padding, dividers, gaps, avatar size and row height all come
// from the loaded page's own stylesheet rather than from a guess. The page doesn't
// jump when the data lands, because the ghost was already the right shape.
//
// The coupling that buys (a preset referencing a stage's classes) is deliberate and
// fenced four ways:
//   1. Layout classes only — never state or colour modifiers (--hero, aria-pressed,
//      um-badge--admin). Those change; the box model doesn't.
//   2. Every real-class reference lives in THIS file, so a rename is one grep.
//   3. skeleton-presets.test.ts reads each host stage's source and fails when a class
//      a preset still emits has been renamed away.
//   4. Ghosts are inert: <span>, never <button>/<a>/<input>, no href, no tabindex.
//      Asserted by test — a skeleton must never be focusable or clickable.
//
// Presets are added as they are proven against a real screen, not up front.

import { skLeaf, skFill, skRoot } from "./skeleton-parts.ts";

export type SkeletonPreset =
  | "cards" // the legacy generic ghost cards — still the default
  | "list-rows"; // .run-list--card of avatar / name / sub / side rows

export interface SkeletonOpts {
  preset?: SkeletonPreset;
  /** Rows / cards / tiles, depending on the preset. */
  rows?: number;
  /** Ghost the shared list toolbar (search + count) above the body. */
  toolbar?: boolean;
  /** What a screen reader is told during the wait. */
  label?: string;
}

/** A bare number stays valid (28 call sites pass one). An array composes shapes. */
export type SkeletonSpec = number | SkeletonOpts | SkeletonOpts[];

// --- legacy: the generic ghost cards ----------------------------------------
// Byte-identical to the markup this kit replaced, so the unmigrated call sites
// render exactly as before. Locked by a golden-string test — do not reformat.
const CARD = `
    <div class="skeleton__card">
      <div class="skeleton__bar skeleton__bar--title"></div>
      <div class="skeleton__bar skeleton__bar--wide"></div>
      <div class="skeleton__bar skeleton__bar--narrow"></div>
    </div>
  `;

function cards({ rows = 3 }: SkeletonOpts): string {
  return Array.from({ length: rows }, () => CARD).join("");
}

// --- list-rows: Home recents, Past 1:1s, Team --------------------------------
// Mirrors managerRow() in stages/runs.ts. Widths vary per row so the ghost reads
// as a list of different people rather than a barcode.
const NAME_W = ["11ch", "8ch", "13ch", "9ch", "12ch", "10ch"];
const SUB_W = ["22ch", "18ch", "25ch", "20ch", "23ch", "19ch"];

function listRows({ rows = 4, toolbar = false }: SkeletonOpts): string {
  const items = Array.from({ length: rows }, (_, i) => {
    // --sk-i staggers the shimmer down the list (see motion.css).
    return `<li class="run-list__item" style="--sk-i:${i}">
      <span class="run-list__row">
        ${skFill("ds-avatar run-list__avatar")}
        <span class="run-list__main">
          ${skLeaf("run-list__name", NAME_W[i % NAME_W.length])}
          ${skLeaf("run-list__sub", SUB_W[i % SUB_W.length])}
        </span>
        <span class="run-list__side">${skLeaf("runs-list__stars text-sm", "4ch")}</span>
      </span>
    </li>`;
  }).join("");

  const bar = toolbar
    ? `<div class="list-toolbar">${skFill("list-toolbar__search")}${skLeaf("list-toolbar__count", "6ch")}</div>`
    : "";

  return `${bar}<ul class="run-list run-list--card">${items}</ul>`;
}

// --- dispatch ----------------------------------------------------------------

// The root's own classes differ per preset, because the root has to sit in the
// same box the loaded content would.
const ROOT_CLASS: Record<SkeletonPreset, string> = {
  cards: "skeleton",
  "list-rows": "l-stack l-stack--3",
};

const RENDER: Record<SkeletonPreset, (o: SkeletonOpts) => string> = {
  cards,
  "list-rows": listRows,
};

function one(opts: SkeletonOpts): string {
  // An unknown preset falls back to the generic cards rather than rendering
  // nothing — a wrong-shaped ghost beats a blank screen.
  const preset: SkeletonPreset = opts.preset && opts.preset in RENDER ? opts.preset : "cards";
  return skRoot(ROOT_CLASS[preset], RENDER[preset](opts), opts.label);
}

/** Normalise every accepted spec shape to a list of option bags. */
function normalise(spec: SkeletonSpec | undefined): SkeletonOpts[] {
  if (spec === undefined) return [{}];
  if (typeof spec === "number") return [{ preset: "cards", rows: spec }];
  if (Array.isArray(spec)) return spec.length ? spec : [{}];
  return [spec];
}

/** Render a skeleton for any spec. The one entry point; the two public doors wrap it. */
export function skeletonFor(spec?: SkeletonSpec): string {
  const parts = normalise(spec);
  if (parts.length === 1) return one(parts[0]!);
  // Composed shapes (a tile grid above a table) stack on the standard rhythm.
  return `<div class="l-stack l-stack--6">${parts.map(one).join("")}</div>`;
}
