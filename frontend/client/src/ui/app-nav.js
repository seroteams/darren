// Top app nav — brand mark + quick links to the standalone areas. Persistent
// across every screen; during a session it stacks above the stage breadcrumb
// (session-topbar), which the CSS offsets account for.
// Mounted once in main.js.

import { STAGES } from "../state.js";

const LOGO = `<svg class="app-nav__logo" viewBox="0 0 48 48" width="26" height="26" aria-hidden="true" focusable="false">
  <rect width="48" height="48" rx="12" fill="var(--color-ink)"/>
  <rect x="9" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <rect x="32.5" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <circle cx="24" cy="18.5" r="5" fill="#fff"/>
  <circle cx="24" cy="31" r="5" fill="#fff"/>
</svg>`;

export function createAppNav({ setState, resetSession } = {}) {
  const el = document.createElement("header");
  el.className = "app-nav";
  document.body.classList.add("has-app-nav");
  el.innerHTML = `
    <div class="app-nav__inner">
      <button type="button" class="app-nav__brand js-home" aria-label="Sero home">
        ${LOGO}
        <span class="app-nav__word">Sero</span>
      </button>
      <nav class="app-nav__links" aria-label="Primary">
        <button type="button" class="app-nav__link js-nav-home">Home</button>
        <button type="button" class="app-nav__link js-nav-new">New session</button>
        <button type="button" class="app-nav__link js-nav-compare">Compare runs</button>
        <button type="button" class="app-nav__link js-nav-lexicon">Phrase library</button>
      </nav>
    </div>
  `;

  const goHome = () => setState && setState({ stage: STAGES.START });
  el.querySelector(".js-home").addEventListener("click", goHome);
  el.querySelector(".js-nav-home").addEventListener("click", goHome);
  el.querySelector(".js-nav-new").addEventListener("click", () => {
    if (resetSession) resetSession();
    setState && setState({ stage: STAGES.INTAKE, substage: "NAME" });
  });
  el.querySelector(".js-nav-compare").addEventListener("click", () => setState && setState({ stage: STAGES.COMPARE }));
  el.querySelector(".js-nav-lexicon").addEventListener("click", () => setState && setState({ stage: STAGES.LEXICON_REVIEW }));

  // Persistent across every screen — it stacks above the in-session breadcrumb,
  // so there's no per-stage visibility logic. render() is kept for parity with
  // the other top-level chrome and to re-assert the body class after any reset.
  function render() {
    document.body.classList.add("has-app-nav");
  }

  return { el, render };
}
