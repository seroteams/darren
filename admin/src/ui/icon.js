// Lucide is Sero's one and only icon system (DESIGN.md §5 "Icons"). Every glyph in
// the app is a Lucide icon rendered through this helper — no emoji, no bespoke SVG —
// so the whole UI shares one stroke weight, size, and currentColor treatment.
//
// The admin app renders HTML as strings (innerHTML), so this returns an SVG *string*
// rather than a DOM node. Lucide ships each icon as an array of [tag, attrs] child
// nodes; import the one you need and pass it in:
//
//   import { House } from "lucide";
//   import { icon } from "../ui/icon.js";
//   el.innerHTML = `<span class="app-nav__icon">${icon(House)}</span>`;
//
// Importing named icons keeps the bundle to only the glyphs you use (tree-shaken).

const escapeAttr = (value) => String(value).replace(/"/g, "&quot;");

const renderChild = ([tag, attrs]) =>
  `<${tag} ${Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(" ")}/>`;

// node:  a Lucide IconNode (array of [tag, attrs]) imported from "lucide".
// size:  pixel width/height (default 22, the nav-rail size; pass 16 for inline-with-text).
// label: when set, the icon is exposed to screen readers with that name; otherwise
//        it is aria-hidden (the default — most icons sit beside a text label).
// fill:  paint the shape (e.g. a filled star); defaults to "none" (outline only).
export function icon(node, { size = 22, className = "", label, fill = "none" } = {}) {
  const children = (node || []).map(renderChild).join("");
  const cls = ["sero-icon", className].filter(Boolean).join(" ");
  const a11y = label ? `role="img" aria-label="${escapeAttr(label)}"` : `aria-hidden="true"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${escapeAttr(fill)}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}" ${a11y} focusable="false">${children}</svg>`;
}
