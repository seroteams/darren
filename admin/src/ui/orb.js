// Renders the Sero loading mark (the animated "pong" logo) + label + animated dots.
// The mark is the same one that plays on app boot (boot-splash.js); here it's the
// reusable inline loader for engine-thinking waits, driven by sero-pong.js. When a
// subline is set, the generic "Working" prefix is hidden.
// Contract unchanged from the old gradient orb: { el, setLabel, exit }.

import { drivePong } from "./sero-pong.js";

export function createOrb(initialLabel = "") {
  const el = document.createElement("div");
  el.className = "thinking-orb flex items-center gap-4 thinking-enter";
  el.innerHTML = `
    <div class="orb" aria-hidden="true">
      <svg class="orb__mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <rect class="orb__tile" width="48" height="48" rx="8.24"/>
        <rect class="orb__pad bs-pad-l" x="9" y="12" width="6.5" height="24" rx="3.25"/>
        <rect class="orb__pad bs-pad-r" x="32.5" y="12" width="6.5" height="24" rx="3.25"/>
        <circle class="orb__ball bs-ball" cx="24" cy="18.5" r="4"/>
      </svg>
    </div>
    <div class="thinking-label" aria-live="polite">
      <span class="prefix">Working</span><span class="subline"></span><span class="dots" aria-hidden="true"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>
    </div>
  `;
  const prefix = el.querySelector(".prefix");
  const subline = el.querySelector(".subline");
  const stopPong = drivePong(el.querySelector(".orb__mark"));

  function setLabel(text) {
    el.classList.remove("thinking-enter");
    void el.offsetWidth;
    const hasSub = Boolean(text);
    subline.textContent = hasSub ? `  ${text}` : "";
    prefix.hidden = hasSub;
    el.classList.add("thinking-enter");
  }
  setLabel(initialLabel);

  function exit() {
    return new Promise((resolve) => {
      stopPong();
      el.querySelector(".orb").classList.add("orb--exit");
      el.classList.add("is-exiting");
      setTimeout(resolve, 250);
    });
  }

  return { el, setLabel, exit };
}
