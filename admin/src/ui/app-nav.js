// Left-rail app nav — brand mark + primary links down the left edge. Collapsed
// to an icon strip; opens on hover (or keyboard focus) to reveal labels. Mounted
// once in main.js, persistent across every screen. The session topbar sits to
// its right in-session. render({ stage }) keeps the active link in sync.
// Below 768px the rail is an off-canvas drawer behind a fixed header strip
// (brand + menu button) that this module also owns — same DOM, same role
// filtering; CSS decides which shell shows (see "Mobile shell" in design.css).

import { STAGES, store, isAdmin, isInternalAdmin, isLiveEnv } from "../state.js";
import { isGuestStage } from "../router.js";
import { logout } from "../../../shared/api.js";
import { showAccountSheet } from "./account-sheet.ts";
import { icon } from "./icon.js";
import {
  Users, House, CirclePlus, Library, ArrowLeftRight, MessageSquareText, Languages,
  Waypoints, UsersRound, FileCheck, ShieldCheck, BookOpen, UserRoundCog,
  Palette, LogOut, Lock, Info, MessageSquare, TriangleAlert, Inbox, Menu, UserRoundSearch,
  FlaskConical, Gauge, Settings, LayoutGrid,
} from "lucide";

const LOGO = `<svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true" focusable="false">
  <rect width="48" height="48" rx="12" fill="var(--color-ink)"/>
  <rect x="9" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <rect x="32.5" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <circle cx="24" cy="18.5" r="5" fill="#fff"/>
  <circle cx="24" cy="31" r="5" fill="#fff"/>
</svg>`;

// One Lucide icon per destination, rendered through the shared icon() helper so the
// whole rail keeps one weight and size. Lucide is the ONLY glyph system (DESIGN.md §5).
const ICON = {
  personas: icon(Users),
  home: icon(House),
  new: icon(CirclePlus),
  library: icon(Library),
  compare: icon(ArrowLeftRight),
  lexicon: icon(MessageSquareText),
  joblex: icon(Languages),
  arcs: icon(Waypoints),
  team: icon(UsersRound),
  runs: icon(FileCheck),
  regression: icon(ShieldCheck),
  guide: icon(BookOpen),
  registered: icon(UserRoundCog),
  design: icon(Palette),
  logout: icon(LogOut),
  account: icon(Settings),
  privacy: icon(Lock),
  about: icon(Info),
  feedback: icon(MessageSquare),
  errors: icon(TriangleAlert),
  inbox: icon(Inbox),
  guests: icon(UserRoundSearch),
  tests: icon(FlaskConical),
  pulse: icon(Gauge),
  gallery: icon(LayoutGrid),
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
  { key: "runs", label: "Your 1:1s", stage: STAGES.RUNS, icon: ICON.runs, member: true },
  // Manager app (manager-ready Phase 1) — the paying customer's rail. Reuses existing
  // stages; managers keep console access but never see the internal toolset below.
  { key: "mghome", label: "Home", stage: STAGES.START, icon: ICON.home, mgr: true },
  { key: "mgnew", label: "Start 1:1", stage: STAGES.INTAKE, icon: ICON.new, mgr: true },
  // Team is a customer-app stage, cross-imported so the local Engine app's manager rail
  // matches live (Carl: live and local should look the same).
  { key: "mgteam", label: "Team", stage: STAGES.TEAM, icon: ICON.team, mgr: true },
  { key: "mgruns", label: "Past 1:1s", stage: STAGES.RUNS, icon: ICON.runs, mgr: true },
  // Admin toolset, grouped by JOB (Carl's re-org 2026-07-18): Work (use the coach) ·
  // Engine (tune the coach) · Build (dev tooling) · Operate (run the live service). The old
  // "Sessions/Engine/Admin" split lumped dev tools and live-ops into one "Admin" dump — this
  // splits them. Group headers render for the internal rail only (see render()). Account +
  // Log out no longer live here — they moved to the top-right avatar menu (ui/profile-badge.js).

  // WORK — using the product. Pulse is the console landing + first item (Carl 2026-07-14):
  // opening the console drops you on Pulse (boot lands here — see main.js). Superadmin-only.
  { key: "pulse", label: "Pulse", stage: STAGES.ADMIN_PULSE, icon: ICON.pulse, admin: true, superadmin: true, group: "Work" },
  { key: "home", label: "Start a 1:1", stage: STAGES.START, icon: ICON.home, admin: true, group: "Work" },
  { key: "new", label: "New session", stage: STAGES.INTAKE, icon: ICON.new, admin: true, group: "Work" },
  { key: "library", label: "Library", stage: STAGES.LIBRARY, icon: ICON.library, admin: true, group: "Work" },
  // ENGINE — tuning how the coach talks + paces.
  { key: "lexicon", label: "Coaching phrases", stage: STAGES.LEXICON_REVIEW, icon: ICON.lexicon, admin: true, group: "Engine" },
  { key: "joblex", label: "Role words", stage: STAGES.ROLE_LEXICONS, icon: ICON.joblex, admin: true, group: "Engine" },
  { key: "arcs", label: "Meeting arcs", stage: STAGES.MEETING_ARCS, icon: ICON.arcs, admin: true, group: "Engine" },
  // BUILD — internal dev tooling. Test engine (was under Sessions) is a testing tool, not a
  // session, so it sits here. Compare + Regression fold into the Test engine hub (its page/route
  // stays; only its nav rows are gone). Screens + Tests are hidden on live (live-hide in render()).
  { key: "personas", label: "Test engine", stage: STAGES.PERSONAS, icon: ICON.personas, admin: true, group: "Build" },
  { key: "tests", label: "Tests", stage: STAGES.TEST, icon: ICON.tests, admin: true, group: "Build" },
  { key: "gallery", label: "Screens", stage: STAGES.GALLERY, icon: ICON.gallery, admin: true, group: "Build" },
  { key: "design", label: "Design system", stage: STAGES.DESIGN, icon: ICON.design, admin: true, group: "Build" },
  // OPERATE — running the live service. All superadmin-only (pre-go-live PG7): `admin: true`
  // puts them in the admin rail, `superadmin: true` hides them from every owner but Carl.
  // Cosmetic — the backend 403 is the real wall.
  { key: "registered", label: "User management", stage: STAGES.ADMIN_REGISTERED, icon: ICON.registered, admin: true, superadmin: true, group: "Operate" },
  { key: "guests", label: "Guest runs", stage: STAGES.ADMIN_GUEST_RUNS, icon: ICON.guests, admin: true, superadmin: true, group: "Operate" },
  { key: "inbox", label: "Feedback inbox", stage: STAGES.ADMIN_FEEDBACK, icon: ICON.inbox, admin: true, superadmin: true, group: "Operate" },
  { key: "errors", label: "Error log", stage: STAGES.ADMIN_ERROR_LOG, icon: ICON.errors, admin: true, superadmin: true, group: "Operate" },
];

const MENU_ICON = icon(Menu);

export function createAppNav({ setState, resetSession } = {}) {
  const el = document.createElement("header");
  // Mount HIDDEN: the rail's visibility depends on who's signed in, which we only
  // learn once the async auth check (me()) resolves. Starting visible made a
  // logged-out visitor see the rail flash in, then vanish once boot finished —
  // render() reveals it (removes is-hidden / adds has-app-nav) only when auth is known.
  el.className = "app-nav is-hidden";
  el.id = "app-nav-drawer";

  // Mobile header strip + scrim (display:none on desktop). Appended straight to
  // body — like the topbar's popover — so main.js stays unchanged.
  const bar = document.createElement("div");
  bar.className = "app-nav-mobilebar is-hidden";
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
  // Guide (DEV-only help) no longer has a rail row — the old footer/meta strip it belonged
  // with was dropped from the internal rail in the 2026-07-18 re-org. Still reachable at /guide.

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
      <nav class="app-nav__links app-nav__links--util" aria-label="More">
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
      </nav>
      <nav class="app-nav__links app-nav__links--foot" aria-label="Account">
        <button type="button" class="app-nav__link js-account" data-key="account">
          <span class="app-nav__icon">${ICON.account}</span>
          <span class="app-nav__label">Account</span>
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
    design: () => setState && setState({ stage: STAGES.DESIGN }),
    tests: () => setState && setState({ stage: STAGES.TEST }),
    gallery: () => setState && setState({ stage: STAGES.GALLERY, galleryScreen: null }),
    pulse: () => setState && setState({ stage: STAGES.ADMIN_PULSE }),
    registered: () => setState && setState({ stage: STAGES.ADMIN_REGISTERED }),
    errors: () => setState && setState({ stage: STAGES.ADMIN_ERROR_LOG }),
    inbox: () => setState && setState({ stage: STAGES.ADMIN_FEEDBACK }),
    guests: () => setState && setState({ stage: STAGES.ADMIN_GUEST_RUNS }),
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
  el.querySelector(".js-account")?.addEventListener("click", () => showAccountSheet(store.user));
  el.querySelector(".js-logout").addEventListener("click", onLogout);

  // A stage may light a different row per audience (admin "home" vs manager "mghome") —
  // values are one key or a list; render() matches any of them (only one is visible anyway).
  const ACTIVE_BY_STAGE = {
    [STAGES.START]: ["home", "mghome"],
    [STAGES.RUNS]: ["runs", "mgruns"],
    [STAGES.INTAKE]: ["new", "mgnew"],
    [STAGES.TEAM]: "mgteam",
    [STAGES.PERSON_DETAIL]: "mgteam",
    [STAGES.LIBRARY]: "library",
    [STAGES.COMPARE]: "personas",
    [STAGES.PERSONAS]: "personas",
    [STAGES.LEXICON_REVIEW]: "lexicon",
    [STAGES.ROLE_LEXICONS]: "joblex",
    [STAGES.MEETING_ARCS]: "arcs",
    [STAGES.DESIGN]: "design",
    [STAGES.TEST]: "tests",
    [STAGES.GALLERY]: "gallery",
    [STAGES.ADMIN_PULSE]: "pulse",
    // Pulse drill-down list pages keep the Pulse rail item lit (no nav rows of their own).
    [STAGES.ADMIN_GATE1]: "pulse",
    [STAGES.ADMIN_RUNS]: "pulse",
    [STAGES.ADMIN_RATINGS]: "pulse",
    [STAGES.ADMIN_REGISTERED]: "registered",
    [STAGES.ADMIN_USER]: "registered",
    [STAGES.ADMIN_ERROR_LOG]: "errors",
    [STAGES.ADMIN_FEEDBACK]: "inbox",
    [STAGES.ADMIN_GUEST_RUNS]: "guests",
    [STAGES.GUIDE]: "guide",
    [STAGES.ABOUT]: "about",
    [STAGES.FEEDBACK]: "feedback",
    [STAGES.PRIVACY]: "privacy",
  };

  // Persistent across every screen — re-assert the body class and light up the
  // link that matches the current stage (none during an in-run flow).
  function render({ stage, user } = {}) {
    // The login/register screens stand alone — no nav rail. So does the privacy note
    // when a logged-out visitor opens it from the signup screen (there's no app to navigate yet).
    // And a guest running a 1:1 (no account) gets no rail either — there's nothing to
    // navigate to, and "Past 1:1s" / "Log out" make no sense for them (F-004).
    if (stage === STAGES.LOGIN || stage === STAGES.REGISTER
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
    // Show exactly one audience's rows (manager-ready Phase 1): the internal `admin` role
    // gets the toolset, managers get their customer rail (Home · New 1:1 · Team · Past
    // 1:1s), members get Home · Team · Runs. Log out sits outside this and always shows.
    const internal = isInternalAdmin(user);
    el.classList.toggle("app-nav--member", !internal); // compact, ungrouped rail styling
    // Internal rail drops the whole footer strip — What is Sero? · Send feedback · Privacy ·
    // Account · Log out. Account + Log out moved to the top-right avatar menu (ui/profile-badge.js),
    // the rest aren't needed for an internal operator (Carl 2026-07-18). Managers/members keep the
    // footer (they still need Privacy + Log out there). Inline display so no CSS-file edit is
    // required (design/ CSS is another chat's lane); reversible once that clears.
    const utilNav = el.querySelector(".app-nav__links--util");
    const footNav = el.querySelector(".app-nav__links--foot");
    if (utilNav) utilNav.style.display = internal ? "none" : "";
    if (footNav) footNav.style.display = internal ? "none" : "";
    const wanted = internal ? "admin" : isAdmin(user) ? "mgr" : "member";
    const alwaysShown = new Set(["account", "logout", "privacy", "about", "feedback"]); // account/utility rows
    el.querySelectorAll(".app-nav__link[data-key]").forEach((b) => {
      if (alwaysShown.has(b.dataset.key)) return;
      let show = b.dataset[wanted] === "1";
      // A superadmin-only row (Registered, PG7) shows only for Carl — the flag comes from
      // /auth/me. This is cosmetic; the endpoint still enforces the 403.
      if (show && b.dataset.superadmin === "1" && !(user && user.isSuperadmin)) show = false;
      // Live site: the Test engine (paid persona runs) is off (admin-live-deploy Phase 2).
      // Trimmed from the rail; the deep-link bounce + backend fence back it.
      if (show && isLiveEnv() && (b.dataset.key === "personas" || b.dataset.key === "gallery")) show = false;
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
