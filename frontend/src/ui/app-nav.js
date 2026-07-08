// Left-rail app nav for the customer app — the customer subset of the admin
// app's nav (frontend-admin-split Phase 2). Managers get Home · New 1:1 · Team ·
// Past 1:1s; members get just Past 1:1s (member-view: only-runs). No internal
// toolset, no superadmin rows — those live in the admin app only. Same CSS
// classes as the admin rail (design.css owns the look), same mobile drawer behaviour.

import { STAGES, isAdmin } from "../../../admin/src/state.js";
import { isGuestStage } from "../router.js";
import { logout } from "../../../shared/api.js";
import { icon } from "../../../admin/src/ui/icon.js";
import { House, CirclePlus, UsersRound, FileCheck, LogOut, Lock, Info, MessageSquare, Menu } from "lucide";

const LOGO = `<svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true" focusable="false">
  <rect width="48" height="48" rx="12" fill="var(--color-ink)"/>
  <rect x="9" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <rect x="32.5" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <circle cx="24" cy="18.5" r="5" fill="#fff"/>
  <circle cx="24" cy="31" r="5" fill="#fff"/>
</svg>`;

// One Lucide icon per destination — the customer rail mirrors the admin rail's
// glyphs (admin/src/ui/app-nav.js), rendered through the shared icon() helper.
const ICON = {
  home: icon(House),
  new: icon(CirclePlus),
  team: icon(UsersRound),
  runs: icon(FileCheck),
  logout: icon(LogOut),
  privacy: icon(Lock),
  about: icon(Info),
  feedback: icon(MessageSquare),
};

// One row per destination, tagged by audience: `mgr` = manager rail, `member` =
// plain-member rail. render() shows exactly one audience's rows.
const LINKS = [
  // Member app — Past 1:1s only (member-view: only-runs). A member can't start or run a
  // 1:1, so their rail is a single row: their own past 1:1s. Shown only to members.
  { key: "runs", label: "Past 1:1s", stage: STAGES.RUNS, icon: ICON.runs, member: true },
  { key: "mghome", label: "Home", stage: STAGES.START, icon: ICON.home, mgr: true },
  { key: "mgnew", label: "New 1:1", stage: STAGES.INTAKE, icon: ICON.new, mgr: true },
  { key: "mgteam", label: "Team", stage: STAGES.TEAM, icon: ICON.team, mgr: true },
  { key: "mgruns", label: "Past 1:1s", stage: STAGES.RUNS, icon: ICON.runs, mgr: true },
];

const MENU_ICON = icon(Menu);

export function createAppNav({ setState, resetSession } = {}) {
  const el = document.createElement("header");
  el.className = "app-nav app-nav--member"; // compact, ungrouped rail styling
  el.id = "app-nav-drawer";
  document.body.classList.add("has-app-nav");

  // Mobile header strip + scrim (display:none on desktop).
  const bar = document.createElement("div");
  bar.className = "app-nav-mobilebar";
  bar.innerHTML = `
    <button type="button" class="app-nav-mobilebar__menu js-menu" aria-label="Open menu" aria-expanded="false" aria-controls="app-nav-drawer">${MENU_ICON}</button>
    <button type="button" class="app-nav-mobilebar__brand js-bar-home" aria-label="Sero home">
      <span class="app-nav__icon">${LOGO}</span>
      <span>Sero</span>
    </button>
  `;
  document.body.appendChild(bar);

  const scrim = document.createElement("div");
  scrim.className = "app-nav-scrim";
  document.body.appendChild(scrim);

  const menuBtn = bar.querySelector(".js-menu");
  let drawerOpen = false;
  function setDrawer(open) {
    drawerOpen = !!open;
    el.classList.toggle("is-open", drawerOpen);
    scrim.classList.toggle("is-open", drawerOpen);
    document.body.classList.toggle("app-nav-open", drawerOpen);
    menuBtn.setAttribute("aria-expanded", drawerOpen ? "true" : "false");
    menuBtn.setAttribute("aria-label", drawerOpen ? "Close menu" : "Open menu");
  }
  menuBtn.addEventListener("click", () => setDrawer(!drawerOpen));
  scrim.addEventListener("click", () => setDrawer(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawerOpen) setDrawer(false);
  });
  el.addEventListener("click", (e) => {
    if (e.target.closest("button")) setDrawer(false);
  });

  el.innerHTML = `
    <div class="app-nav__inner">
      <button type="button" class="app-nav__brand js-home" aria-label="Sero home">
        <span class="app-nav__icon">${LOGO}</span>
        <span class="app-nav__word">Sero</span>
      </button>
      <nav class="app-nav__links" aria-label="Primary">
        ${LINKS.map((it) => `<button type="button" class="app-nav__link js-nav-${it.key}" data-key="${it.key}" data-member="${it.member ? "1" : ""}" data-mgr="${it.mgr ? "1" : ""}">
          <span class="app-nav__icon">${it.icon}</span>
          <span class="app-nav__label">${it.label}</span>
        </button>`).join("")}
      </nav>
      <nav class="app-nav__links app-nav__links--foot" aria-label="Account">
        <button type="button" class="app-nav__link js-nav-about" data-key="about">
          <span class="app-nav__icon">${ICON.about}</span>
          <span class="app-nav__label">What is Sero?</span>
        </button>
        <button type="button" class="app-nav__link js-nav-feedback" data-key="feedback">
          <span class="app-nav__icon">${ICON.feedback}</span>
          <span class="app-nav__label">Send feedback</span>
        </button>
        <button type="button" class="app-nav__link js-nav-privacy" data-key="privacy">
          <span class="app-nav__icon">${ICON.privacy}</span>
          <span class="app-nav__label">Privacy</span>
        </button>
        <button type="button" class="app-nav__link js-logout" data-key="logout">
          <span class="app-nav__icon">${ICON.logout}</span>
          <span class="app-nav__label">Log out</span>
        </button>
      </nav>
    </div>
  `;

  const onNav = {
    runs: () => setState && setState({ stage: STAGES.RUNS }),
    mghome: () => setState && setState({ stage: STAGES.START }),
    mgnew: () => {
      if (resetSession) resetSession();
      setState && setState({ stage: STAGES.INTAKE, substage: "NAME" });
    },
    mgteam: () => setState && setState({ stage: STAGES.TEAM }),
    mgruns: () => setState && setState({ stage: STAGES.RUNS }),
    privacy: () => setState && setState({ stage: STAGES.PRIVACY }),
    about: () => setState && setState({ stage: STAGES.ABOUT }),
    feedback: () => setState && setState({ stage: STAGES.FEEDBACK }),
  };

  // Brand tap goes to whichever home the logged-in role has; render() records it.
  // A member's "home" is their Past 1:1s list (member-view: only-runs).
  let homeKey = "mghome";
  const goHome = () => onNav[homeKey]();
  el.querySelector(".js-home").addEventListener("click", goHome);
  bar.querySelector(".js-bar-home").addEventListener("click", goHome);
  LINKS.forEach((it) => el.querySelector(`.js-nav-${it.key}`)?.addEventListener("click", onNav[it.key]));
  ["about", "feedback", "privacy"].forEach((k) => el.querySelector(`.js-nav-${k}`)?.addEventListener("click", onNav[k]));

  async function onLogout() {
    try { await logout(); } catch (e) { console.warn("[nav] logout failed:", e); }
    if (resetSession) resetSession();
    setState && setState({ user: null, stage: STAGES.LOGIN });
  }
  el.querySelector(".js-logout").addEventListener("click", onLogout);

  // A stage may light a different row per audience — values are one key or a
  // list; render() matches any of them (only one is visible anyway).
  const ACTIVE_BY_STAGE = {
    [STAGES.START]: "mghome",
    [STAGES.TEAM]: "mgteam",
    [STAGES.RUNS]: ["runs", "mgruns"],
    [STAGES.INTAKE]: "mgnew",
    [STAGES.ABOUT]: "about",
    [STAGES.FEEDBACK]: "feedback",
    [STAGES.PRIVACY]: "privacy",
  };

  function render({ stage, user } = {}) {
    // The start/login/register screens stand alone — no nav rail. So does the privacy note
    // when a logged-out visitor opens it from the signup screen. And a guest running a
    // 1:1 (no account) gets no rail either — there's nothing to navigate to, and
    // "Past 1:1s" / "Log out" make no sense for them (F-004).
    if (stage === STAGES.WELCOME || stage === STAGES.LOGIN || stage === STAGES.REGISTER
        || (stage === STAGES.PRIVACY && !user) || (!user && isGuestStage(stage))) {
      el.classList.add("is-hidden");
      bar.classList.add("is-hidden");
      setDrawer(false);
      document.body.classList.remove("has-app-nav");
      return;
    }
    el.classList.remove("is-hidden");
    bar.classList.remove("is-hidden");
    document.body.classList.add("has-app-nav");
    // Show exactly one audience's rows: managers get their rail, members theirs.
    const wanted = isAdmin(user) ? "mgr" : "member";
    homeKey = wanted === "mgr" ? "mghome" : "runs";
    const alwaysShown = new Set(["logout", "privacy", "about", "feedback"]);
    el.querySelectorAll(".app-nav__link[data-key]").forEach((b) => {
      if (alwaysShown.has(b.dataset.key)) return;
      b.hidden = b.dataset[wanted] !== "1";
    });
    const activeKeys = [].concat(ACTIVE_BY_STAGE[stage] || []);
    el.querySelectorAll(".app-nav__link").forEach((b) => {
      const on = activeKeys.includes(b.dataset.key);
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
  }

  return { el, render };
}
