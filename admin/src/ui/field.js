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

// Focus the primary input inside a field node. Prefers input/textarea over
// buttons. Called once the swap is complete.
export function focusField(node) {
  if (!node) return;
  const target =
    node.querySelector("input:not([type=hidden]), textarea") ||
    node.querySelector("[data-autofocus]") ||
    node.querySelector("button");
  if (target && typeof target.focus === "function") {
    // Focus on next frame so the transition doesn't fight us for paint
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }
}
