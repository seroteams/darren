// The shared screen scaffold (refactor-2026-07 P5): ONE loading state and ONE
// "couldn't load" card for list/detail screens, instead of each screen
// hand-rolling a grey "Loading…" sentence and its own error markup. Screens
// keep their own shell (header + stage wrapper) — those genuinely differ —
// and pass their own copy, so adopting this changes no words.
//
// Loading = the standard ghost cards (createSkeleton's markup, DESIGN.md's one
// skeleton), as a string for innerHTML-built screens.

import { skeletonHtml } from "./skeleton.js";

export function loadingHtml(rows = 3): string {
  return skeletonHtml(rows);
}

export interface ErrorCardOpts {
  /** The eyebrow line. Default matches the admin screens' standard card. */
  title?: string;
  /** Body copy — an HTML string (some screens carry a mailto link). Caller-owned. */
  copyHtml?: string;
  retryLabel?: string;
}

// The standard couldn't-load card: card-flat, eyebrow title, dim copy, ghost
// retry. Pair with wireRetry.
export function errorCardHtml(opts: ErrorCardOpts = {}): string {
  const { title = "Couldn't load", copyHtml = "Something went wrong. Please try again.", retryLabel = "Try again" } = opts;
  return `
    <section class="card-flat space-y-3">
      <div class="eyebrow">${title}</div>
      <p class="text-ink-dim">${copyHtml}</p>
      <button type="button" class="btn btn--ghost js-retry">${retryLabel}</button>
    </section>`;
}

export function wireRetry(root: ParentNode, onRetry: () => void): void {
  root.querySelector(".js-retry")?.addEventListener("click", onRetry);
}
