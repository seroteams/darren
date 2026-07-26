// The two public doors to the loading-skeleton kit. Both are thin: the shapes and
// the markup live in skeleton-presets.ts, which is the one place that knows what
// Sero's screens look like.
//
// A skeleton previews the shape of what's about to land, so the page never sits
// empty and never jumps when the data arrives. Pass a preset for a screen whose
// real layout is known:
//
//   loadingHtml({ preset: "list-rows", rows: 5, toolbar: true })
//
// A bare number still means the generic ghost cards, byte-for-byte as before, so
// screens migrate one at a time. Shimmer, anti-flash and reduced-motion are all
// handled in motion.css.
//
// Filename stays .js on purpose — twenty stages import "./skeleton.js", and
// renaming buys nothing.

import { skeletonFor } from "./skeleton-presets.ts";

/** The HTML-string door, for screens built with innerHTML. */
export function skeletonHtml(spec = 3) {
  return skeletonFor(spec);
}

/** The DOM-node door, for screens that appendChild / replaceChildren. */
export function createSkeleton(spec = 3) {
  const el = document.createElement("div");
  el.innerHTML = skeletonFor(spec);
  // skeletonFor already emits the styled root; hand that back rather than
  // wrapping it in a second div that would break the parent's layout.
  return el.firstElementChild ?? el;
}
