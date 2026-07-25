// Ghost "content is coming" placeholder shown during AI generation waits.
// Pairs with the thinking orb: the orb says "working", the skeleton previews
// the shape of what's about to land so the page never sits empty. Shimmer and
// reduced-motion are handled in motion.css.

const CARD = `
    <div class="skeleton__card">
      <div class="skeleton__bar skeleton__bar--title"></div>
      <div class="skeleton__bar skeleton__bar--wide"></div>
      <div class="skeleton__bar skeleton__bar--narrow"></div>
    </div>
  `;

// The same ghost cards as an HTML string, for screens that build innerHTML
// (screen-scaffold.ts's loading state). createSkeleton below stays the DOM-node
// door for the node-based call sites — both render identical markup.
export function skeletonHtml(rows = 3) {
  return `<div class="skeleton" aria-hidden="true">${Array.from({ length: rows }, () => CARD).join("")}</div>`;
}

export function createSkeleton(rows = 3) {
  const el = document.createElement("div");
  el.className = "skeleton";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = Array.from({ length: rows }, () => CARD).join("");
  return el;
}
