// The one page-header contract (design-consolidation Phase 0): optional breadcrumb
// above, eyebrow = nav group, h1 = page name, optional lede, actions right. Pure
// string render on the existing .page-header primitive (design/primitives.css);
// actionsHtml is trusted caller markup (a button built from the shared recipes).

import { escapeHtml } from "./html.js";
import { breadcrumb, type Crumb } from "./breadcrumb.ts";

export type PageHeaderOpts = {
  title: string;
  eyebrow?: string;
  lede?: string;
  actionsHtml?: string;
  crumbs?: Crumb[];
};

export function pageHeader(opts: PageHeaderOpts): string {
  const eyebrow = opts.eyebrow ? `<div class="page-header__step">${escapeHtml(opts.eyebrow)}</div>` : "";
  const h1 = `<h1 class="h1">${escapeHtml(opts.title)}</h1>`;
  const titleZone = opts.actionsHtml
    ? `<div class="page-header__row">${h1}<div class="page-header__actions">${opts.actionsHtml}</div></div>`
    : h1;
  const lede = opts.lede ? `<p class="page-header__lede">${escapeHtml(opts.lede)}</p>` : "";
  const crumbs = opts.crumbs?.length ? breadcrumb(opts.crumbs) : "";
  return `${crumbs}<header class="page-header">${eyebrow}${titleZone}${lede}</header>`;
}
