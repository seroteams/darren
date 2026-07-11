// Typeform-style field swap. `host` is the container; `render()` returns the
// node to place inside. Outgoing field slides up and fades; incoming fades in
// from below. 100ms overlap.
//
// Returns a promise that resolves with the inserted node once it's in the DOM
// and marked .is-in, so callers can focus the right thing.

export function swapField(host, renderNext) {
  return new Promise((resolve) => {
    const outgoing = host.firstElementChild;
    const next = renderNext();
    next.classList.add("field-enter");

    if (outgoing) {
      outgoing.classList.add("field-exit");
      requestAnimationFrame(() => outgoing.classList.add("is-out"));
      setTimeout(() => outgoing.remove(), 240);
    }

    const delay = outgoing ? 140 : 0;
    setTimeout(() => {
      host.appendChild(next);
      requestAnimationFrame(() => {
        next.classList.add("is-in");
        resolve(next);
      });
    }, delay);
  });
}

// Touch devices (phones/tablets): never steal focus into a control on render —
// focusing a text box pops the on-screen keyboard over the very question the
// user is trying to read (phone walk 2026-07-11). They tap when ready to type.
export function isTouchScreen() {
  return window.matchMedia("(pointer: coarse)").matches;
}

// Focus the primary control inside a field node. An explicit [data-autofocus]
// wins (so a field can choose, e.g., a pill group over its text box); otherwise
// fall back to the first input/textarea, then any button. Called after swap.
export function focusField(node) {
  if (!node || isTouchScreen()) return;
  const target =
    node.querySelector("[data-autofocus]") ||
    node.querySelector("input:not([type=hidden]), textarea") ||
    node.querySelector("button");
  if (target && typeof target.focus === "function") {
    // Focus on next frame so the transition doesn't fight us for paint
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }
}
