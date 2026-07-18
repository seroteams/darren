// Profile badge — a small chip pinned top-right showing who's signed in (an initial
// circle + the email + the role in plain words). Shown for every signed-in role — it's
// the at-a-glance "which account am I in", which matters while we test with three
// logins (admin / manager / member). Hidden on the auth screens and during the
// in-session prep flow (where the stage topbar + notes panel own the top).
// Mounted once in main.js; render({ stage, user }) keeps it in sync, same as app-nav.
//
// For the INTERNAL rail (admin/superadmin), the chip is also the home for Account +
// Log out: those left the left-rail footer in the 2026-07-18 re-org, so here the chip
// becomes a click-to-open menu. Managers/members keep the static chip (their Account +
// Log out still live in their rail footer) — the menu is gated on isInternalAdmin.
// The menu's styles are injected here (once) rather than added to design/app-nav.css,
// because that file is another chat's lane; migrate them there when it clears.

import { STAGES, store, isInternalAdmin } from "../state.js";
import { isFlowStage } from "../router.js";
import { logout } from "../../../shared/api.js";
import { showAccountSheet } from "./account-sheet.ts";

// First letter of the name, falling back to the email — the glyph in the circle.
function initialOf(user) {
  const src = (user?.name || user?.email || "").trim();
  return src ? src[0].toUpperCase() : "?";
}

// Plain-words role for the chip. Handles both user shapes (roles array from /auth/me,
// single role from login) — same duality state.js's isAdmin() deals with.
function roleLabelOf(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [];
  if (roles.includes("admin")) return "Admin";
  if (roles.includes("manager")) return "Manager";
  if (roles.includes("member")) return "Member";
  return "";
}

// One-time injected styles for the caret + dropdown menu. All new classes — nothing here
// overrides the existing .profile-badge chrome in design/app-nav.css.
let stylesInjected = false;
function injectMenuStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const s = document.createElement("style");
  s.textContent = `
    .profile-badge--menu { cursor: pointer; }
    .profile-badge__caret {
      display: inline-flex; margin-left: 2px; color: var(--color-ink-subtle, var(--color-ink));
      opacity: .55; transition: transform .15s ease;
    }
    .profile-badge__caret svg { width: 14px; height: 14px; }
    .profile-badge.is-open .profile-badge__caret { transform: rotate(180deg); }
    .profile-badge__menu {
      position: absolute; top: calc(100% + 6px); right: 0; min-width: 168px;
      display: flex; flex-direction: column; gap: 2px; padding: 6px;
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--sero-radius-md, 12px); box-shadow: var(--sero-shadow-md, 0 16px 40px rgba(8,30,48,.2));
      z-index: var(--sero-z-fixed, 30);
    }
    .profile-badge__menu[hidden] { display: none; }
    .profile-badge__mi {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 8px 10px; border: 0; border-radius: var(--sero-radius-sm, 8px);
      background: transparent; color: var(--color-ink); font: inherit;
      font-size: var(--type-body-sm, 14px); text-align: left; cursor: pointer;
    }
    .profile-badge__mi:hover, .profile-badge__mi:focus-visible {
      background: var(--color-surface-hover, rgba(0,0,0,.05)); outline: none;
    }
    .profile-badge__mi svg { width: 15px; height: 15px; opacity: .65; flex: 0 0 auto; }
  `;
  document.head.appendChild(s);
}

const CARET = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
const IC_ACCOUNT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/></svg>`;
const IC_LOGOUT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4v16h-4"/><path d="M11 8l-4 4 4 4M7 12h9"/></svg>`;

export function createProfileBadge({ setState, resetSession } = {}) {
  injectMenuStyles();
  const el = document.createElement("div");
  el.className = "profile-badge";
  el.hidden = true;
  el.innerHTML = `
    <span class="profile-badge__avatar" aria-hidden="true"></span>
    <span class="profile-badge__email"></span>
    <span class="profile-badge__caret" aria-hidden="true" hidden>${CARET}</span>
    <div class="profile-badge__menu" role="menu" hidden>
      <button type="button" class="profile-badge__mi" role="menuitem" data-act="account">${IC_ACCOUNT}<span>Account</span></button>
      <button type="button" class="profile-badge__mi" role="menuitem" data-act="logout">${IC_LOGOUT}<span>Log out</span></button>
    </div>
  `;
  const avatarEl = el.querySelector(".profile-badge__avatar");
  const emailEl = el.querySelector(".profile-badge__email");
  const caretEl = el.querySelector(".profile-badge__caret");
  const menuEl = el.querySelector(".profile-badge__menu");

  let interactive = false; // true only for the internal rail
  let open = false;
  function setOpen(next) {
    open = !!next && interactive;
    menuEl.hidden = !open;
    el.classList.toggle("is-open", open);
    el.setAttribute("aria-expanded", open ? "true" : "false");
  }

  // The chip itself toggles the menu (internal only). Clicks on a menu item are handled
  // below and must not re-toggle, so ignore clicks that land inside the menu.
  el.addEventListener("click", (e) => {
    if (!interactive) return;
    if (menuEl.contains(e.target)) return;
    setOpen(!open);
  });
  // Close on outside click / Escape.
  document.addEventListener("click", (e) => {
    if (open && !el.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) setOpen(false);
  });

  async function onLogout() {
    setOpen(false);
    try { await logout(); } catch (e) { console.warn("[profile-badge] logout failed:", e); }
    if (resetSession) resetSession();
    if (setState) setState({ user: null, stage: STAGES.LOGIN });
  }
  menuEl.querySelector('[data-act="account"]').addEventListener("click", () => {
    setOpen(false);
    showAccountSheet(store.user);
  });
  menuEl.querySelector('[data-act="logout"]').addEventListener("click", onLogout);

  function render({ stage, user } = {}) {
    const show =
      !!user &&
      stage !== STAGES.LOGIN &&
      stage !== STAGES.REGISTER &&
      stage !== STAGES.INTAKE && // Setup: the session topbar owns the profile chip
      !isFlowStage(stage);
    if (!show) {
      setOpen(false);
      el.hidden = true;
      return;
    }
    const email = user.email || "";
    const role = roleLabelOf(user);
    avatarEl.textContent = initialOf(user);
    emailEl.textContent = role ? `${email} · ${role}` : email;
    el.title = email ? `Signed in as ${email}${role ? ` (${role.toLowerCase()})` : ""}` : "Signed in";
    // Internal operator: the chip becomes the Account + Log out menu (those left the rail).
    // Everyone else keeps the plain static chip.
    interactive = isInternalAdmin(user);
    el.classList.toggle("profile-badge--menu", interactive);
    caretEl.hidden = !interactive;
    el.setAttribute("role", interactive ? "button" : "img");
    if (interactive) el.setAttribute("aria-haspopup", "menu");
    else { el.removeAttribute("aria-haspopup"); setOpen(false); }
    el.hidden = false;
  }

  return { el, render };
}
