// The one waiting screen for the flow's generation moments (design-consolidation
// Phase 3): centred orb + the current step's name + a skeleton preview, identical
// for Bank and Eval. Pure string render; hosts mount the orb (ui/orb.js) into
// .js-fi-orb and the skeleton (ui/skeleton.js) into .js-fi-skeleton.
// Styles: design/flow-kit.css.

import { escapeHtml } from "./html.js";

export function flowInterstitial(opts: { step: string }): string {
  return (
    `<div class="flow-interstitial">` +
    `<div class="flow-interstitial__orb js-fi-orb"></div>` +
    `<div class="flow-interstitial__step eyebrow eyebrow--slot">${escapeHtml(opts.step)}</div>` +
    `<div class="flow-interstitial__skeleton js-fi-skeleton"></div>` +
    `</div>`
  );
}
