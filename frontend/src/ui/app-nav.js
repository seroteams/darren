// Left-rail app nav for the customer app — the customer subset of the admin
// app's nav (frontend-admin-split Phase 2). Managers get Home · New 1:1 · Team ·
// Past 1:1s; members get just Past 1:1s (member-view: only-runs). No internal
// toolset, no superadmin rows — those live in the admin app only. Same CSS
// classes as the admin rail (design.css owns the look), same mobile drawer behaviour.

import { STAGES, isAdmin } from "../../../admin/src/state.js";
import { isGuestStage, isFlowStage, urlForState } from "../router.js";
import { logout } from "../../../shared/api.js";
import { icon } from "../../../admin/src/ui/icon.js";
import { House, CirclePlus, UsersRound, UserCog, FileCheck, LogOut, Info, MessageSquare, Menu, PanelLeftClose, PanelLeftOpen } from "lucide";

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
  members: icon(UserCog),
  runs: icon(FileCheck),
  logout: icon(LogOut),
  about: icon(Info),
  feedback: icon(MessageSquare),
  collapse: icon(PanelLeftClose),
  expand: icon(PanelLeftOpen),
};

// Real <a href> for a nav row when its stage has a route (the customer app is
// served at the site root — no base prefix). Rows without one stay <button>s.
function hrefFor(stage) {
  if (stage == null) return null;
  return urlForState({ stage }) || null;
}

// The rail row markup, <a> or <button> by whether the destination has a URL.
function rowHtml({ key, icon: glyph, label, href = null, data = "" }) {
  const inner = `<span class="app-nav__icon">${glyph}</span><span class="app-nav__label">${label}</span>`;
  if (href) return `<a class="app-nav__link js-nav-${key}" href="${href}" data-key="${key}" ${data}>${inner}</a>`;
  return `<button type="button" class="app-nav__link js-nav-${key}" data-key="${key}" ${data}>${inner}</button>`;
}

// One row per destination, tagged by audience: `mgr` = manager rail, `member` =
// plain-member rail. render() shows exactly one audience's rows.
const LINKS = [
  // Member app — Past 1:1s only (member-view: about-me only). A member can't start or run a
  // 1:1, so their rail is a single row: the 1:1s their manager prepped ABOUT them
  // (MEMBER_HOME → about-me, list-only). Shown only to members.
  { key: "runs", label: "Your 1:1s", stage: STAGES.MEMBER_HOME, icon: ICON.runs, member: true },
  { key: "mghome", label: "Home", stage: STAGES.START, icon: ICON.home, mgr: true },
  { key: "mgnew", label: "Start 1:1", stage: STAGES.INTAKE, icon: ICON.new, mgr: true },
  { key: "mgteam", label: "Team", stage: STAGES.TEAM, icon: ICON.team, mgr: true },
  { key: "mgruns", label: "Past 1:1s", stage: STAGES.RUNS, icon: ICON.runs, mgr: true },
  // "Members" (workspace access admin) is NOT here — it lives in the account/admin group at the
  // foot of the rail (Notion/Linear pattern: your daily nav is your work; access lives in settings).
];

const MENU_ICON = icon(Menu);

export function createAppNav({ setState, resetSession } = {}) {
  const el = document.createElement("header");
  // Mount HIDDEN: the rail's visibility depends on who's signed in, which we
  // only learn once the async auth check (me()) resolves. Starting visible made
  // a logged-out visitor see the rail flash in, then vanish once boot finished —
  // render() reveals it (removes is-hidden / adds has-app-nav) only when auth is known.
  el.className = "app-nav app-nav--member is-hidden"; // compact, ungrouped rail styling
  el.id = "app-nav-drawer";

  // Mobile header strip + scrim (display:none on desktop).
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
  el.addEventListener("click", (e) => {
    if (e.target.closest("button, a")) setDrawer(false);
  });

  el.innerHTML = `
    <div class="app-nav__inner">
      <button type="button" class="app-nav__brand js-home" aria-label="Sero home">
        <span class="app-nav__icon">${LOGO}</span>
        <span class="app-nav__word">Sero</span>
      </button>
      <button type="button" class="app-nav__collapse js-collapse" aria-label="Collapse menu" title="Collapse menu">${ICON.collapse}</button>
      <nav class="app-nav__links" aria-label="Primary">
        ${LINKS.map((it) => rowHtml({
          key: it.key,
          icon: it.icon,
          label: it.label,
          href: hrefFor(it.stage),
          data: `data-member="${it.member ? "1" : ""}" data-mgr="${it.mgr ? "1" : ""}"`,
        })).join("")}
      </nav>
      <nav class="app-nav__links app-nav__links--foot" aria-label="Workspace">
        ${rowHtml({ key: "mgmembers", icon: ICON.members, label: "Members", href: hrefFor(STAGES.MEMBERS), data: 'data-mgr="1"' })}
        ${rowHtml({ key: "about", icon: ICON.about, label: "What is Sero?", href: hrefFor(STAGES.ABOUT) })}
        ${rowHtml({ key: "feedback", icon: ICON.feedback, label: "Send feedback", href: hrefFor(STAGES.FEEDBACK) })}
      </nav>
      <nav class="app-nav__links app-nav__links--logout" aria-label="Session">
        <button type="button" class="app-nav__link js-logout" data-key="logout">
          <span class="app-nav__icon">${ICON.logout}</span>
          <span class="app-nav__label">Log out</span>
        </button>
      </nav>
    </div>
  `;

  // Pinned open is the default; collapsing to the icon strip is the user's
  // choice, remembered per browser (design audit S2). Same key as the admin app
  // so the preference carries across both.
  const COLLAPSE_KEY = "seroNavCollapsed";
  let collapsed = false;
  try { collapsed = localStorage.getItem(COLLAPSE_KEY) === "1"; } catch {}
  const collapseBtn = el.querySelector(".js-collapse");
  function applyCollapsed() {
    document.body.classList.toggle("app-nav-collapsed", collapsed);
    collapseBtn.innerHTML = collapsed ? ICON.expand : ICON.collapse;
    const label = collapsed ? "Expand menu" : "Collapse menu";
    collapseBtn.setAttribute("aria-label", label);
    collapseBtn.title = label;
  }
  collapseBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // not a nav row — don't trip the drawer-close listener
    collapsed = !collapsed;
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0"); } catch {}
    applyCollapsed();
  });
  applyCollapsed();

  const onNav = {
    runs: () => setState && setState({ stage: STAGES.MEMBER_HOME }),
    mghome: () => setState && setState({ stage: STAGES.START }),
    mgnew: () => {
      if (resetSession) resetSession();
      setState && setState({ stage: STAGES.INTAKE, substage: "NAME" });
    },
    mgteam: () => setState && setState({ stage: STAGES.TEAM }),
    mgmembers: () => setState && setState({ stage: STAGES.MEMBERS }),
    mgruns: () => setState && setState({ stage: STAGES.RUNS }),
    about: () => setState && setState({ stage: STAGES.ABOUT }),
    feedback: () => setState && setState({ stage: STAGES.FEEDBACK }),
  };

  // Brand tap goes to whichever home the logged-in role has; render() records it.
  // A member's "home" is their Past 1:1s list (member-view: only-runs).
  let homeKey = "mghome";
  const goHome = () => onNav[homeKey]();
  // Plain clicks stay in the SPA (setState); modified clicks (ctrl/cmd/shift —
  // "open in new tab") fall through to the real href.
  const navClick = (fn) => (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    fn();
  };
  el.querySelector(".js-home").addEventListener("click", goHome);
  bar.querySelector(".js-bar-home").addEventListener("click", goHome);
  LINKS.forEach((it) => el.querySelector(`.js-nav-${it.key}`)?.addEventListener("click", navClick(onNav[it.key])));
  ["mgmembers", "about", "feedback"].forEach((k) => el.querySelector(`.js-nav-${k}`)?.addEventListener("click", navClick(onNav[k])));

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
    [STAGES.PERSON_DETAIL]: "mgteam",
    [STAGES.GUIDED]: "mgteam",
    [STAGES.MEMBERS]: "mgmembers",
    [STAGES.MEMBER_HOME]: "runs",
    [STAGES.RUNS]: "mgruns",
    [STAGES.INTAKE]: "mgnew",
    [STAGES.ABOUT]: "about",
    [STAGES.FEEDBACK]: "feedback",
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
    const alwaysShown = new Set(["logout", "about", "feedback"]);
    el.querySelectorAll(".app-nav__link[data-key]").forEach((b) => {
      if (alwaysShown.has(b.dataset.key)) return;
      b.hidden = b.dataset[wanted] !== "1";
    });
    // During the run flow no stage maps a row of its own — keep "Start 1:1" lit
    // so the rail still says where you are (design audit S2).
    const activeKeys = [].concat(
      ACTIVE_BY_STAGE[stage] || (isFlowStage(stage) ? ["mgnew"] : []),
    );
    el.querySelectorAll(".app-nav__link").forEach((b) => {
      const on = activeKeys.includes(b.dataset.key);
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
  }

  return { el, render };
}
