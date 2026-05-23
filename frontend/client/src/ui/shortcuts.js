export function createShortcutsOverlay(shortcuts) {
  const el = document.createElement("div");
  el.className = "kbd-overlay";
  el.setAttribute("aria-hidden", "true");

  el.innerHTML = shortcuts.map(({ key, label }) =>
    `<div class="kbd-overlay__row">
      <span class="kbd-overlay__label">${label}</span>
      ${key.split("+").map(k => `<span class="kbd">${k}</span>`).join('<span class="kbd-overlay__plus">+</span>')}
    </div>`
  ).join("");

  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-visible"));

  return {
    el,
    destroy() {
      el.classList.remove("is-visible");
      setTimeout(() => el.remove(), 220);
    },
  };
}
