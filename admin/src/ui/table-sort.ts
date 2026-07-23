// Column sorting for the shared table (design-consolidation Phase 0). Two pure pieces:
// a <th> render whose button carries the sort key (hosts wire js-lt-sort clicks), and
// a non-mutating sort helper. Direction carets are CSS (lt-sort--asc/desc).

import { escapeHtml } from "./html.js";

export type SortDir = "asc" | "desc";

export function sortableHeader(label: string, key: string, dir?: SortDir): string {
  const aria = dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none";
  const dirClass = dir ? ` lt-sort--${dir}` : "";
  return (
    `<th aria-sort="${aria}">` +
    `<button type="button" class="lt-sort js-lt-sort${dirClass}" data-sort="${escapeHtml(key)}">${escapeHtml(label)}</button>` +
    `</th>`
  );
}

export function sortRows<T>(rows: readonly T[], get: (row: T) => string | number, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * sign;
    return String(va).localeCompare(String(vb), undefined, { sensitivity: "base" }) * sign;
  });
}
