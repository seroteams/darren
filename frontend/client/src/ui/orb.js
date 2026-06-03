// Renders the thinking orb + label + animated dots wave.
// When a subline is set, the generic prefix is hidden.

export function createOrb(initialLabel = "") {
  const el = document.createElement("div");
  el.className = "flex items-center gap-4 thinking-enter";
  el.innerHTML = `
    <div class="orb" aria-hidden="true">
      <div class="orb__core"></div>
      <div class="orb__ring"></div>
    </div>
    <div class="thinking-label" aria-live="polite">
      <span class="prefix">Working</span><span class="subline"></span><span class="dots" aria-hidden="true"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>
    </div>
  `;
  const prefix = el.querySelector(".prefix");
  const subline = el.querySelector(".subline");

  function setLabel(text) {
    el.classList.remove("thinking-enter");
    void el.offsetWidth;
    const hasSub = Boolean(text);
    subline.textContent = hasSub ? `\u00a0\u00a0${text}` : "";
    prefix.hidden = hasSub;
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
