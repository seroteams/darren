// Skeleton primitives — the dumb half of the loading-skeleton kit. These know
// nothing about Sero's screens; they just ghost one leaf of a real layout.
//
// The trick that makes shape-matched skeletons work: a ghost leaf IS the real
// element (same classes) holding a single &nbsp;. That builds exactly the line box
// real text would, so the leaf inherits the real font-size / weight / line-height
// and the row comes out the same height as a loaded row. Put an empty <div> bar in
// there instead and it collapses: a .lp-tile is ~32px empty against ~120px loaded,
// and the page jumps when the data lands.
//
// Two shapes of leaf, because two things go wrong in different ways:
//   skLeaf — a line of text. The bar is drawn by an absolutely-positioned ::after,
//            so it contributes NO height. An inline-block bar would sit on the
//            baseline and push the line box ~6px taller than the real text.
//   skFill — a surface with its own box (an avatar circle, a search input). The
//            element keeps its real dimensions and is simply painted over.
//
// The app-facing catalogue is skeleton-presets.ts; these parts are for building
// presets, not for calling from a stage.

// One non-breaking space. Enough to create the line box, invisible to find-in-page
// and to text extraction: no lorem, no fake names.
const FILL = "&nbsp;";

const cls = (a: string, b: string) => (a ? `${a} ${b}` : b);

/**
 * A ghost LINE of text. Hand it the real classes of the element it stands in for
 * (`run-list__name`, `um-table__cell`) and a bar width. Widths in `ch` so the ghost
 * scales with the type rather than against it.
 */
export function skLeaf(classes: string, width = "60%"): string {
  return `<span class="${cls(classes, "sk-leaf")}" style="--sk-w:${width}" aria-hidden="true">${FILL}</span>`;
}

/**
 * A ghost leaf of SEVERAL lines: the real element wrapping one ghost line per
 * width. Use where the real copy is ours and fixed, so its line count is known
 * (a dashboard tile's label and caption). Each line needs its own block box or
 * they all land on one line, because skLeaf is inline by design.
 */
export function skLines(classes: string, widths: string[]): string {
  // .sk-line is full-width, which is what makes the lines stack even when the real
  // element is a wrapping flex ROW (a dashboard tile's delta line is one).
  const lines = widths.map((w) => `<div class="sk-line">${skLeaf("", w)}</div>`).join("");
  return `<div class="${classes}">${lines}</div>`;
}

/**
 * A ghost SURFACE that keeps the box of the real classes it is handed and is
 * painted over whole. For anything already sized by its own CSS.
 */
export function skFill(classes: string): string {
  return `<span class="${cls(classes, "sk-fill")}" aria-hidden="true">${FILL}</span>`;
}

/**
 * The root of every skeleton. `classes` are the real layout classes of whatever the
 * loaded page puts here, so the ghost sits in the same box as the content it stands
 * in for.
 *
 * Carries the anti-flash (`.sk`) and the announcement. Today's skeleton is
 * aria-hidden with no announcement at all, so a screen-reader user gets silence
 * during the wait; role="status" fixes that, and every ghost leaf above is
 * aria-hidden so only the label is read.
 */
export function skRoot(classes: string, inner: string, label = "Loading…"): string {
  return (
    `<div class="${cls(classes, "sk")}" role="status" aria-live="polite">` +
    `<span class="sr-only">${label}</span>` +
    inner +
    `</div>`
  );
}
