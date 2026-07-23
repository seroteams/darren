// The one list toolbar for every list screen (design-consolidation Phase 0):
// search left, filter chips, count right. Pure string render like breadcrumb.ts —
// hosts wire the js- hooks (js-lt-search input, js-lt-filter chips), so this module
// stays DOM-free and unit-tests as a string. Styles: design/admin-tables.css.

import { escapeHtml } from "./html.js";

export type ToolbarFilter = { key: string; label: string; active?: boolean };
export type ToolbarOpts = {
  search?: { placeholder: string };
  count?: { n: number; noun: string; nounPlural?: string };
  filters?: ToolbarFilter[];
};

export function listToolbar(opts: ToolbarOpts): string {
  const parts: string[] = [];
  if (opts.search) {
    parts.push(
      `<input type="search" class="list-toolbar__search js-lt-search" placeholder="${escapeHtml(opts.search.placeholder)}">`,
    );
  }
  if (opts.filters?.length) {
    const chips = opts.filters.map((f) =>
      `<button type="button" class="list-toolbar__filter js-lt-filter" data-key="${escapeHtml(f.key)}" aria-pressed="${f.active ? "true" : "false"}">${escapeHtml(f.label)}</button>`,
    );
    parts.push(`<div class="list-toolbar__filters">${chips.join("")}</div>`);
  }
  if (opts.count) {
    const { n, noun, nounPlural } = opts.count;
    const word = n === 1 ? noun : (nounPlural ?? `${noun}s`);
    parts.push(`<span class="list-toolbar__count">${n} ${escapeHtml(word)}</span>`);
  }
  return `<div class="list-toolbar">${parts.join("")}</div>`;
}
