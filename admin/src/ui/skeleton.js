// Ghost "content is coming" placeholder shown during AI generation waits.
// Pairs with the thinking orb: the orb says "working", the skeleton previews
// the shape of what's about to land so the page never sits empty. Shimmer and
// reduced-motion are handled in motion.css.

export function createSkeleton(rows = 3) {
  const el = document.createElement("div");
  el.className = "skeleton";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = Array.from({ length: rows }, () => `
    <div class="skeleton__card">
      <div class="skeleton__bar skeleton__bar--title"></div>
      <div class="skeleton__bar skeleton__bar--wide"></div>
      <div class="skeleton__bar skeleton__bar--narrow"></div>
    </div>
  `).join("");
  return el;
}
