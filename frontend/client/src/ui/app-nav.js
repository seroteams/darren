// Left-rail app nav — brand mark + primary links down the left edge. Collapsed
// to an icon strip; opens on hover (or keyboard focus) to reveal labels. Mounted
// once in main.js, persistent across every screen. The session topbar sits to
// its right in-session. render({ stage }) keeps the active link in sync.

import { STAGES } from "../state.js";

const LOGO = `<svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true" focusable="false">
  <rect width="48" height="48" rx="12" fill="var(--color-ink)"/>
  <rect x="9" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <rect x="32.5" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <circle cx="24" cy="18.5" r="5" fill="#fff"/>
  <circle cx="24" cy="31" r="5" fill="#fff"/>
</svg>`;

// Line icons (Lucide-style, currentColor stroke) — one per destination.
const icon = (paths) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const ICON = {
  home: icon(`<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V9.5"/>`),
  new: icon(`<circle cx="12" cy="12" r="9"/><path d="M12 8.5v7M8.5 12h7"/>`),
  library: icon(`<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>`),
  compare: icon(`<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>`),
  lexicon: icon(`<path d="M21 14a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M7 9h10M7 12.5h6"/>`),
  joblex: icon(`<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>`),
  guide: icon(`<path d="M12 7.5v13"/><path d="M3 18.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>`),
};

// One row per destination. Guide is DEV-only. `stage` drives the active highlight.
const LINKS = [
  { key: "home", label: "Home", stage: STAGES.START, icon: ICON.home },
  { key: "new", label: "New session", stage: STAGES.INTAKE, icon: ICON.new },
  { key: "library", label: "Library", stage: STAGES.LIBRARY, icon: ICON.library },
  { key: "compare", label: "Compare runs", stage: STAGES.COMPARE, icon: ICON.compare },
  { key: "lexicon", label: "Phrase library", stage: STAGES.LEXICON_REVIEW, icon: ICON.lexicon },
  { key: "joblex", label: "Job lexicons", stage: STAGES.ROLE_LEXICONS, icon: ICON.joblex },
];

export function createAppNav({ setState, resetSession } = {}) {
  const el = document.createElement("header");
  el.className = "app-nav";
  document.body.classList.add("has-app-nav");

  const items = [...LINKS];
  if (import.meta.env.DEV) items.push({ key: "guide", label: "Guide", stage: STAGES.GUIDE, icon: ICON.guide });

  el.innerHTML = `
    <div class="app-nav__inner">
      <button type="button" class="app-nav__brand js-home" aria-label="Sero home">
        <span class="app-nav__icon">${LOGO}</span>
        <span class="app-nav__word">Sero<span class="app-nav__tagline"> Engine</span></span>
      </button>
      <nav class="app-nav__links" aria-label="Primary">
        ${items
          .map(
            (it) => `<button type="button" class="app-nav__link js-nav-${it.key}" data-key="${it.key}">
          <span class="app-nav__icon">${it.icon}</span>
          <span class="app-nav__label">${it.label}</span>
        </button>`
          )
          .join("")}
      </nav>
    </div>
  `;

  const onNav = {
    home: () => setState && setState({ stage: STAGES.START }),
    new: () => {
      if (resetSession) resetSession();
      setState && setState({ stage: STAGES.INTAKE, substage: "NAME" });
    },
    library: () => setState && setState({ stage: STAGES.LIBRARY }),
    compare: () => setState && setState({ stage: STAGES.COMPARE }),
    lexicon: () => setState && setState({ stage: STAGES.LEXICON_REVIEW }),
    joblex: () => setState && setState({ stage: STAGES.ROLE_LEXICONS }),
    guide: () => setState && setState({ stage: STAGES.GUIDE }),
  };

  el.querySelector(".js-home").addEventListener("click", onNav.home);
  items.forEach((it) => el.querySelector(`.js-nav-${it.key}`)?.addEventListener("click", onNav[it.key]));

  const ACTIVE_BY_STAGE = {
    [STAGES.START]: "home",
    [STAGES.INTAKE]: "new",
    [STAGES.LIBRARY]: "library",
    [STAGES.COMPARE]: "compare",
    [STAGES.LEXICON_REVIEW]: "lexicon",
    [STAGES.ROLE_LEXICONS]: "joblex",
    [STAGES.GUIDE]: "guide",
  };

  // Persistent across every screen — re-assert the body class and light up the
  // link that matches the current stage (none during an in-run flow).
  function render({ stage } = {}) {
    document.body.classList.add("has-app-nav");
    const activeKey = ACTIVE_BY_STAGE[stage] || null;
    el.querySelectorAll(".app-nav__link").forEach((b) => {
      const on = b.dataset.key === activeKey;
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
  }

  return { el, render };
}
