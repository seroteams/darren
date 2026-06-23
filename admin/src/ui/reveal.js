// Reveal helpers. Adds `.is-in` to elements with a stagger.
//
// revealSequence([...HTMLElements], { stagger, initialDelay })
// revealOne(el)     — adds is-in to a single element (next frame)

export function revealOne(el, delay = 0) {
  setTimeout(() => requestAnimationFrame(() => el.classList.add("is-in")), delay);
}

export function revealSequence(nodes, { stagger = 60, initialDelay = 0 } = {}) {
  nodes.forEach((n, i) => revealOne(n, initialDelay + i * stagger));
}

// Waits ms milliseconds; used to pace beats in the briefing reveal.
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
