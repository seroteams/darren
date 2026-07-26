// The one waiting screen for the flow's generation moments (design-consolidation
// Phase 3): centred orb + the current step's name + a skeleton preview. Pure string
// render; hosts mount the orb (ui/orb.js) into .js-fi-orb.
//
// These screens route onward the moment they finish, so what they are "loading" is
// the NEXT screen. Pass that screen's skeleton spec and the wait previews where you
// are about to land, rather than three generic grey cards at every step alike.
// Styles: design/flow-kit.css.

import { escapeHtml } from "./html.js";
import { skeletonHtml } from "./skeleton.js";
import type { SkeletonSpec } from "./skeleton-presets.ts";

export function flowInterstitial(opts: { step: string; skeleton?: SkeletonSpec }): string {
  // Hosts that still fill .js-fi-skeleton themselves keep working: omit the spec
  // and the slot renders empty, exactly as before.
  const ghost = opts.skeleton === undefined ? "" : skeletonHtml(opts.skeleton);
  return (
    `<div class="flow-interstitial">` +
    `<div class="flow-interstitial__orb js-fi-orb"></div>` +
    `<div class="flow-interstitial__step eyebrow eyebrow--slot">${escapeHtml(opts.step)}</div>` +
    `<div class="flow-interstitial__skeleton js-fi-skeleton">${ghost}</div>` +
    `</div>`
  );
}
