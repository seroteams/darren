// One shared breadcrumb trail for the admin drill-downs, so every level shows the same
// "where am I" path instead of a bespoke back button. Non-current crumbs are real
// <button>s (keyboard-operable); the current page is plain text. The host stage wires
// clicks by the crumb's data-nav key — this module stays pure (no DOM, no routing),
// so it renders identically everywhere and unit-tests as a string. Styles: design/breadcrumb.css.

import { escapeHtml } from "./html.js";

// `nav` set → a clickable step back to that destination; omitted → a non-navigating crumb
// (always the last/current one).
export type Crumb = { label: string; nav?: string };

export function breadcrumb(items: Crumb[]): string {
  const sep = `<span class="crumb__sep" aria-hidden="true">›</span>`;
  const parts = items.map((c, i) => {
    const last = i === items.length - 1;
    const label = escapeHtml(c.label);
    // A step is a button only when it can navigate AND isn't the current page.
    if (!last && c.nav) {
      return `<button type="button" class="crumb crumb--link js-crumb" data-nav="${escapeHtml(c.nav)}">${label}</button>`;
    }
    return `<span class="crumb crumb--current"${last ? ' aria-current="page"' : ""}>${label}</span>`;
  });
  return `<nav class="crumbs" aria-label="Breadcrumb">${parts.join(sep)}</nav>`;
}
