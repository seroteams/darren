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
      // rAF does not fire in a tab that isn't painting (backgrounded, restored
      // session). This promise is awaited at the end of intake's mount(), and
      // boot-shell serialises every render through one chain — so a queued-forever
      // callback froze the whole nav rail: the URL changed, the screen never did
      // (console audit, 2026-07-29). Whichever of the frame or the timer lands
      // first reveals and resolves; both paths are idempotent, and in a painting
      // tab rAF still wins, so the enter animation is unchanged. Same belt-and-
      // braces boot-shell.js already uses for its own stage reveal.
      let done = false;
      const reveal = () => {
        if (done) return;
        done = true;
        next.classList.add("is-in");
        resolve(next);
      };
      requestAnimationFrame(reveal);
      setTimeout(reveal, 60);
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
