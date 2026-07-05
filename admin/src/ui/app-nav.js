// Left-rail app nav — brand mark + primary links down the left edge. Collapsed
// to an icon strip; opens on hover (or keyboard focus) to reveal labels. Mounted
// once in main.js, persistent across every screen. The session topbar sits to
// its right in-session. render({ stage }) keeps the active link in sync.
// Below 768px the rail is an off-canvas drawer behind a fixed header strip
// (brand + menu button) that this module also owns — same DOM, same role
// filtering; CSS decides which shell shows (see "Mobile shell" in design.css).

import { STAGES, isAdmin, isInternalAdmin } from "../state.js";
import { logout } from "../../../shared/api.js";

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
  personas: icon(`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`),
  home: icon(`<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V9.5"/>`),
  new: icon(`<circle cx="12" cy="12" r="9"/><path d="M12 8.5v7M8.5 12h7"/>`),
  library: icon(`<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>`),
  compare: icon(`<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>`),
  lexicon: icon(`<path d="M21 14a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M7 9h10M7 12.5h6"/>`),
  joblex: icon(`<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>`),
  arcs: icon(`<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 6h6a3 3 0 0 1 3 3v.5"/><path d="M7 18h6a3 3 0 0 0 3-3v-.5"/>`),
  team: icon(`<path d="M18 21a6 6 0 0 0-12 0"/><circle cx="12" cy="8" r="4"/><path d="M22 21a5 5 0 0 0-4-4.9"/><path d="M2 21a5 5 0 0 1 4-4.9"/>`),
  runs: icon(`<path d="M14 2v6h6"/><path d="M4 6a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="m9 15 2 2 4-4"/>`),
  regression: icon(`<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>`),
  guide: icon(`<path d="M12 7.5v13"/><path d="M3 18.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v12.5a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>`),
  tasks: icon(`<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="m9 14 2 2 4-4"/>`),
  registered: icon(`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>`),
  universe: icon(`<circle cx="12" cy="12" r="3"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>`),
  design: icon(`<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>`),
  logout: icon(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>`),
  privacy: icon(`<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`),
  about: icon(`<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`),
  feedback: icon(`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`),
  errors: icon(`<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`),
};

// One row per destination. Guide is DEV-only. `stage` drives the active highlight.
// Each row is tagged by audience: `admin: true` = the owner/admin tooling; `member: true`
// = the plain member app (admin-access-guard Phase 2 + member-nav Phase 1). render()
// shows exactly one audience's rows based on the logged-in role. A member sees just
// Home · Team · Runs; an admin sees the full internal toolset (unchanged).
// Admin rows also carry a `group` (Sessions · Engine · Admin) — render() draws a muted
// section header before each new group so the long admin rail reads in chunks. Member
// rows have no group (their short list needs none).
const LINKS = [
  // Member app — Past 1:1s only (member-view: only-runs). A member can't start or run a
  // 1:1, so their rail is a single row: their own past 1:1s. Shown only to members.
  { key: "runs", label: "Past 1:1s", stage: STAGES.RUNS, icon: ICON.runs, member: true },
  // Manager app (manager-ready Phase 1) — the paying customer's rail. Reuses existing
  // stages; managers keep console access but never see the internal toolset below.
  { key: "mghome", label: "Home", stage: STAGES.START, icon: ICON.home, mgr: true },
  { key: "mgnew", label: "New 1:1", stage: STAGES.INTAKE, icon: ICON.new, mgr: true },
  { key: "mgteam", label: "Team", stage: STAGES.TEAM, icon: ICON.team, mgr: true },
  { key: "mgruns", label: "Past 1:1s", stage: STAGES.RUNS, icon: ICON.runs, mgr: true },
  // Admin toolset, grouped into sections.
  { key: "home", label: "Home", stage: STAGES.START, icon: ICON.home, admin: true, group: "Sessions" },
  { key: "tasks", label: "Tasks", stage: STAGES.TASKS, icon: ICON.tasks, admin: true, group: "Sessions" },
  { key: "new", label: "New session", stage: STAGES.INTAKE, icon: ICON.new, admin: true, group: "Sessions" },
  { key: "library", label: "Library", stage: STAGES.LIBRARY, icon: ICON.library, admin: true, group: "Sessions" },
  // Compare + Regression folded into the Test engine hub (test-engine-hub Phase 4):
  // Compare is reached from a persona's run history; the safety check is a strip on
  // the hub. Compare's page/route stays; only its nav rows are gone.
  { key: "personas", label: "Test engine", stage: STAGES.PERSONAS, icon: ICON.personas, admin: true, group: "Sessions" },
  { key: "lexicon", label: "Coaching phrases", stage: STAGES.LEXICON_REVIEW, icon: ICON.lexicon, admin: true, group: "Engine" },
  { key: "joblex", label: "Role words", stage: STAGES.ROLE_LEXICONS, icon: ICON.joblex, admin: true, group: "Engine" },
  { key: "arcs", label: "Meeting arcs", stage: STAGES.MEETING_ARCS, icon: ICON.arcs, admin: true, group: "Engine" },
  // Just for fun — the 3D live map of the app (universe.ts). Admin-only eye candy.
  { key: "universe", label: "Universe", stage: STAGES.UNIVERSE, icon: ICON.universe, admin: true, group: "Engine" },
  // Static page (admin/public/sero-flowbite/) — opens in a new tab, outside the SPA.
  { key: "design", label: "Design system", icon: ICON.design, admin: true, group: "Admin" },
  // Superadmin-only (pre-go-live PG7). `admin: true` puts it in the admin rail; `superadmin:
  // true` hides it from every owner but Carl. Cosmetic — the backend 403 is the real wall.
  { key: "registered", label: "User management", stage: STAGES.ADMIN_REGISTERED, icon: ICON.registered, admin: true, superadmin: true, group: "Admin" },
  { key: "errors", label: "Error log", stage: STAGES.ADMIN_ERROR_LOG, icon: ICON.errors, admin: true, superadmin: true, group: "Admin" },
];

const MENU_ICON = icon(`<path d="M4 6h16M4 12h16M4 18h16"/>`);

export function createAppNav({ setState, resetSession } = {}) {
  const el = document.createElement("header");
  el.className = "app-nav";
  el.id = "app-nav-drawer";
  document.body.classList.add("has-app-nav");

  // Mobile header strip + scrim (display:none on desktop). Appended straight to
  // body — like the topbar's popover — so main.js stays unchanged.
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
  // Any tap inside the drawer that lands on a link (or the brand) navigates —
  // close so the destination is visible. No-op when already closed (desktop).
  el.addEventListener("click", (e) => {
    if (e.target.closest("button")) setDrawer(false);
  });

  const items = [...LINKS];
  if (import.meta.env.DEV) items.push({ key: "guide", label: "Guide", stage: STAGES.GUIDE, icon: ICON.guide, admin: true, group: "Admin" });

  el.innerHTML = `
    <div class="app-nav__inner">
      <button type="button" class="app-nav__brand js-home" aria-label="Sero home">
        <span class="app-nav__icon">${LOGO}</span>
        <span class="app-nav__word">Sero<span class="app-nav__tagline"> Engine</span></span>
      </button>
      <nav class="app-nav__links" aria-label="Primary">
        ${(() => {
          let lastGroup = null;
          return items
            .map((it) => {
              // A muted section header opens each new admin group. Members' rows carry no
              // group, so they render header-less (and render() hides these in member view).
              let head = "";
              if (it.group && it.group !== lastGroup) {
                head = `<div class="app-nav__group-label" data-admin="1"><span>${it.group}</span></div>`;
                lastGroup = it.group;
              }
              return `${head}<button type="button" class="app-nav__link js-nav-${it.key}" data-key="${it.key}" data-admin="${it.admin ? "1" : ""}" data-member="${it.member ? "1" : ""}" data-mgr="${it.mgr ? "1" : ""}" data-superadmin="${it.superadmin ? "1" : ""}">
          <span class="app-nav__icon">${it.icon}</span>
          <span class="app-nav__label">${it.label}</span>
        </button>`;
            })
            .join("");
        })()}
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
    home: () => setState && setState({ stage: STAGES.START }),
    runs: () => setState && setState({ stage: STAGES.RUNS }),
    new: () => {
      if (resetSession) resetSession();
      setState && setState({ stage: STAGES.INTAKE, substage: "NAME" });
    },
    // Manager rail — same destinations, own rows (keys must be unique per button).
    mghome: () => setState && setState({ stage: STAGES.START }),
    mgnew: () => {
      if (resetSession) resetSession();
      setState && setState({ stage: STAGES.INTAKE, substage: "NAME" });
    },
    mgteam: () => setState && setState({ stage: STAGES.TEAM }),
    mgruns: () => setState && setState({ stage: STAGES.RUNS }),
    library: () => setState && setState({ stage: STAGES.LIBRARY }),
    compare: () => setState && setState({ stage: STAGES.COMPARE }),
    personas: () => setState && setState({ stage: STAGES.PERSONAS }),
    lexicon: () => setState && setState({ stage: STAGES.LEXICON_REVIEW }),
    joblex: () => setState && setState({ stage: STAGES.ROLE_LEXICONS }),
    arcs: () => setState && setState({ stage: STAGES.MEETING_ARCS }),
    tasks: () => setState && setState({ stage: STAGES.TASKS }),
    design: () => window.open("/sero-flowbite/index.html", "_blank", "noopener"),
    universe: () => setState && setState({ stage: STAGES.UNIVERSE }),
    registered: () => setState && setState({ stage: STAGES.ADMIN_REGISTERED }),
    errors: () => setState && setState({ stage: STAGES.ADMIN_ERROR_LOG }),
    guide: () => setState && setState({ stage: STAGES.GUIDE }),
    privacy: () => setState && setState({ stage: STAGES.PRIVACY }),
    about: () => setState && setState({ stage: STAGES.ABOUT }),
    feedback: () => setState && setState({ stage: STAGES.FEEDBACK }),
  };

  el.querySelector(".js-home").addEventListener("click", onNav.home);
  bar.querySelector(".js-bar-home").addEventListener("click", onNav.home);
  items.forEach((it) => el.querySelector(`.js-nav-${it.key}`)?.addEventListener("click", onNav[it.key]));
  ["about", "feedback", "privacy"].forEach((k) => el.querySelector(`.js-nav-${k}`)?.addEventListener("click", onNav[k]));

  async function onLogout() {
    try { await logout(); } catch (e) { console.warn("[nav] logout failed:", e); }
    if (resetSession) resetSession();
    setState && setState({ user: null, stage: STAGES.LOGIN });
  }
  el.querySelector(".js-logout").addEventListener("click", onLogout);

  // A stage may light a different row per audience (admin "home" vs manager "mghome") —
  // values are one key or a list; render() matches any of them (only one is visible anyway).
  const ACTIVE_BY_STAGE = {
    [STAGES.START]: ["home", "mghome"],
    [STAGES.TEAM]: "mgteam",
    [STAGES.RUNS]: ["runs", "mgruns"],
    [STAGES.INTAKE]: ["new", "mgnew"],
    [STAGES.LIBRARY]: "library",
    [STAGES.COMPARE]: "personas",
    [STAGES.PERSONAS]: "personas",
    [STAGES.LEXICON_REVIEW]: "lexicon",
    [STAGES.ROLE_LEXICONS]: "joblex",
    [STAGES.MEETING_ARCS]: "arcs",
    [STAGES.TASKS]: "tasks",
    [STAGES.UNIVERSE]: "universe",
    [STAGES.ADMIN_REGISTERED]: "registered",
    [STAGES.ADMIN_USER]: "registered",
    [STAGES.ADMIN_ERROR_LOG]: "errors",
    [STAGES.GUIDE]: "guide",
    [STAGES.ABOUT]: "about",
    [STAGES.FEEDBACK]: "feedback",
    [STAGES.PRIVACY]: "privacy",
  };

  // Persistent across every screen — re-assert the body class and light up the
  // link that matches the current stage (none during an in-run flow).
  function render({ stage, user } = {}) {
    // The login/register screens stand alone — no nav rail. So does the privacy note when
    // a logged-out visitor opens it from the signup screen (there's no app to navigate yet).
    if (stage === STAGES.LOGIN || stage === STAGES.REGISTER || (stage === STAGES.PRIVACY && !user)) {
      el.classList.add("is-hidden");
      bar.classList.add("is-hidden");
      setDrawer(false);
      document.body.classList.remove("has-app-nav");
      return;
    }
    el.classList.remove("is-hidden");
    bar.classList.remove("is-hidden");
    document.body.classList.add("has-app-nav");
    // Show exactly one audience's rows (manager-ready Phase 1): the internal `admin` role
    // gets the toolset, managers get their customer rail (Home · New 1:1 · Team · Past
    // 1:1s), members get Home · Team · Runs. Log out sits outside this and always shows.
    const internal = isInternalAdmin(user);
    el.classList.toggle("app-nav--member", !internal); // compact, ungrouped rail styling
    const wanted = internal ? "admin" : isAdmin(user) ? "mgr" : "member";
    const alwaysShown = new Set(["logout", "privacy", "about", "feedback"]); // account/utility rows
    el.querySelectorAll(".app-nav__link[data-key]").forEach((b) => {
      if (alwaysShown.has(b.dataset.key)) return;
      let show = b.dataset[wanted] === "1";
      // A superadmin-only row (Registered, PG7) shows only for Carl — the flag comes from
      // /auth/me. This is cosmetic; the endpoint still enforces the 403.
      if (show && b.dataset.superadmin === "1" && !(user && user.isSuperadmin)) show = false;
      b.hidden = !show;
    });
    // Section headers belong to the internal rail only.
    el.querySelectorAll(".app-nav__group-label").forEach((h) => { h.hidden = !internal; });
    const activeKeys = [].concat(ACTIVE_BY_STAGE[stage] || []);
    el.querySelectorAll(".app-nav__link").forEach((b) => {
      const on = activeKeys.includes(b.dataset.key);
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
  }

  // Toggle a small alert dot on a nav item (drawn in CSS off the `has-alert`
  // class). Used by main.js to flag a failing regression check. Mirrored onto
  // the mobile menu button so the dot shows while the drawer is closed.
  const alertKeys = new Set();
  function setAlert(key, on) {
    el.querySelector(`.js-nav-${key}`)?.classList.toggle("has-alert", !!on);
    if (on) alertKeys.add(key);
    else alertKeys.delete(key);
    menuBtn.classList.toggle("has-alert", alertKeys.size > 0);
  }

  return { el, render, setAlert };
}
