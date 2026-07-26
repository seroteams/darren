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
  | "list-rows" // .run-list--card of avatar / name / sub / side rows
  | "table"; // .um-table-wrap of ghost head + body rows

/**
 * How one table column ghosts. Keeps a call site to one short line while still
 * matching the real column, which is the difference between a table-shaped ghost
 * and a convincing one.
 *
 *   "text"          one line at the default width
 *   "text:14ch"     one line at that width
 *   "stack"         two lines (the name-over-email identity column)
 *   "pill"          a badge
 *   "actions"       the ⋯ menu slot
 */
export type SkeletonCol = string;

export interface SkeletonOpts {
  preset?: SkeletonPreset;
  /** Rows / cards / tiles, depending on the preset. */
  rows?: number;
  /** Ghost the shared list toolbar (search + count) above the body. */
  toolbar?: boolean;
  /** table: one entry per column, in order. See SkeletonCol. */
  cols?: SkeletonCol[];
  /**
   * list-rows: emit the <li> rows only, for a host that already owns the <ul> and
   * its own aria-busy (start-core's recents list). A wrapping <div> would be
   * invalid inside a <ul>, so bare mode puts the anti-flash on each row instead
   * and leaves the announcement to the host.
   */
  bare?: boolean;
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

function listRows({ rows = 4, toolbar = false, bare = false }: SkeletonOpts): string {
  const items = Array.from({ length: rows }, (_, i) => {
    // --sk-i staggers the shimmer down the list (see motion.css).
    return `<li class="run-list__item${bare ? " sk" : ""}" style="--sk-i:${i}">
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

  if (bare) return items;

  const bar = toolbar
    ? `<div class="list-toolbar">${skFill("list-toolbar__search")}${skLeaf("list-toolbar__count", "6ch")}</div>`
    : "";

  return `${bar}<ul class="run-list run-list--card">${items}</ul>`;
}

// --- table: the admin tables and the Library ---------------------------------
// Mirrors the um-table anatomy (admin-registered.ts table(), library.js). The real
// <td> padding, borders and vertical-align come from admin-tables.css, so a ghost
// row lands the same height as a loaded one.
const DEFAULT_COLS: SkeletonCol[] = ["stack", "text:12ch", "pill", "text:16ch", "actions"];

function tableCell(spec: SkeletonCol, i: number): string {
  const [kind, width] = spec.split(":");
  switch (kind) {
    case "stack":
      // The identity column: a name over a quieter second line. Each leaf needs its
      // own block box or the two sit on one line and the row lands half-height (the
      // real markup is a <button> then a <div>, and .sk-leaf stays inline so it can
      // live inside a line of text elsewhere).
      return `<td><div>${skLeaf("um-user__open", width || "13ch")}</div><div>${skLeaf("um-user__email", "18ch")}</div></td>`;
    case "pill":
      return `<td>${skLeaf("um-badge", width || "7ch")}</td>`;
    case "actions":
      return `<td class="um-actions">${skFill("row-menu-btn")}</td>`;
    default:
      // Widths alternate a little so a column doesn't read as a solid block.
      return `<td>${skLeaf("", width || (i % 2 ? "10ch" : "14ch"))}</td>`;
  }
}

// Roughly how much room each kind of column wants, in characters. Used only to
// proportion the ghost's columns.
const COL_WEIGHT: Record<string, number> = { stack: 26, pill: 11, actions: 4, text: 14 };

function colWeight(spec: SkeletonCol): number {
  const [kind, width] = spec.split(":");
  const declared = width && /^([\d.]+)ch$/.exec(width);
  if (declared) return Number(declared[1]);
  return COL_WEIGHT[kind!] ?? COL_WEIGHT.text!;
}

function tablePreset({ rows = 5, toolbar = false, cols = DEFAULT_COLS }: SkeletonOpts): string {
  // A real um-table sizes its columns from its content, which the ghost hasn't got.
  // Without this the browser dumps all the slack into one column and the ghost reads
  // as one fat block instead of a table, so proportion them and fix the layout.
  const weights = cols.map(colWeight);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const colgroup = `<colgroup>${weights.map((w) => `<col style="width:${((w / total) * 100).toFixed(2)}%">`).join("")}</colgroup>`;

  const head = cols
    .map((c) => (c.split(":")[0] === "actions" ? `<th class="um-actions-th"></th>` : `<th>${skLeaf("", "8ch")}</th>`))
    .join("");
  const body = Array.from(
    { length: rows },
    (_, r) => `<tr class="um-row" style="--sk-i:${r}">${cols.map(tableCell).join("")}</tr>`,
  ).join("");
  const bar = toolbar
    ? `<div class="list-toolbar">${skFill("list-toolbar__search")}${skLeaf("list-toolbar__count", "6ch")}</div>`
    : "";
  return `${bar}<div class="um-table-wrap"><table class="um-table sk-table">${colgroup}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

// --- dispatch ----------------------------------------------------------------

// The root's own classes differ per preset, because the root has to sit in the
// same box the loaded content would.
const ROOT_CLASS: Record<SkeletonPreset, string> = {
  cards: "skeleton",
  "list-rows": "l-stack l-stack--3",
  table: "l-stack l-stack--3",
};

const RENDER: Record<SkeletonPreset, (o: SkeletonOpts) => string> = {
  cards,
  "list-rows": listRows,
  table: tablePreset,
};

function one(opts: SkeletonOpts): string {
  // An unknown preset falls back to the generic cards rather than rendering
  // nothing — a wrong-shaped ghost beats a blank screen.
  const preset: SkeletonPreset = opts.preset && opts.preset in RENDER ? opts.preset : "cards";
  const inner = RENDER[preset](opts);
  // Bare mode hands back the rows unwrapped; the host owns the container and the
  // announcement (a <div> inside a <ul> would be invalid).
  return opts.bare ? inner : skRoot(ROOT_CLASS[preset], inner, opts.label);
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
