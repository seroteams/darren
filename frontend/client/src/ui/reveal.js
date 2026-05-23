// Reveal helpers. Adds `.is-in` to elements with a stagger.
//
// revealSequence([...HTMLElements], { stagger, initialDelay })
// splitLetters(el)  — wraps each non-space character in .split-letter
// revealOne(el)     — adds is-in to a single element (next frame)

export function revealOne(el, delay = 0) {
  setTimeout(() => requestAnimationFrame(() => el.classList.add("is-in")), delay);
}

export function revealSequence(nodes, { stagger = 60, initialDelay = 0 } = {}) {
  nodes.forEach((n, i) => revealOne(n, initialDelay + i * stagger));
}

export function splitLetters(el, text) {
  el.textContent = "";
  const frag = document.createDocumentFragment();
  for (const ch of text) {
    if (ch === " ") {
      frag.appendChild(document.createTextNode(" "));
      continue;
    }
    const span = document.createElement("span");
    span.className = "split-letter";
    span.textContent = ch;
    frag.appendChild(span);
  }
  el.appendChild(frag);
  return Array.from(el.querySelectorAll(".split-letter"));
}

// Waits ms milliseconds; used to pace beats in the briefing reveal.
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
