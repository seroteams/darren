// Renders the thinking orb + label + animated dots wave.
// Usage:
//   const orb = createOrb("Choosing focus points");
//   root.appendChild(orb.el);
//   orb.setLabel("Generating question bank");
//   await orb.exit();        // animates out; resolves when done

export function createOrb(initialLabel = "") {
  const el = document.createElement("div");
  el.className = "flex items-center gap-4 thinking-enter";
  el.innerHTML = `
    <div class="orb" aria-hidden="true">
      <div class="orb__core"></div>
      <div class="orb__ring"></div>
    </div>
    <div class="thinking-label" aria-live="polite">
      <span class="prefix">Thinking</span><span class="subline"></span><span class="dots" aria-hidden="true"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>
    </div>
  `;
  const subline = el.querySelector(".subline");

  function setLabel(text) {
    // Remove & re-add the enter class so the blur-in replays
    el.classList.remove("thinking-enter");
    void el.offsetWidth;
    subline.textContent = text ? `  ${text}` : "";
    el.classList.add("thinking-enter");
  }
  setLabel(initialLabel);

  function exit() {
    return new Promise((resolve) => {
      el.querySelector(".orb").classList.add("orb--exit");
      el.style.transition = "opacity var(--dur-fast) ease-out";
      el.style.opacity = "0";
      setTimeout(resolve, 250);
    });
  }

  return { el, setLabel, exit };
}
