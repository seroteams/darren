// Profile badge — a small chip pinned top-right showing who's signed in (an initial
// circle + the email + the role in plain words). Shown for every signed-in role — it's
// the at-a-glance "which account am I in", which matters while we test with three
// logins (admin / manager / member). Hidden on the auth screens and during the
// in-session prep flow (where the stage topbar + notes panel own the top).
// Mounted once in main.js; render({ stage, user }) keeps it in sync, same as app-nav.

import { STAGES } from "../state.js";
import { isFlowStage } from "../router.js";

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

export function createProfileBadge() {
  const el = document.createElement("div");
  el.className = "profile-badge";
  el.hidden = true;
  el.innerHTML = `
    <span class="profile-badge__avatar" aria-hidden="true"></span>
    <span class="profile-badge__email"></span>
  `;
  const avatarEl = el.querySelector(".profile-badge__avatar");
  const emailEl = el.querySelector(".profile-badge__email");

  function render({ stage, user } = {}) {
    const show =
      !!user &&
      stage !== STAGES.LOGIN &&
      stage !== STAGES.REGISTER &&
      stage !== STAGES.INTAKE && // Setup: the session topbar owns the profile chip
      !isFlowStage(stage);
    if (!show) {
      el.hidden = true;
      return;
    }
    const email = user.email || "";
    const role = roleLabelOf(user);
    avatarEl.textContent = initialOf(user);
    emailEl.textContent = role ? `${email} · ${role}` : email;
    el.title = email ? `Signed in as ${email}${role ? ` (${role.toLowerCase()})` : ""}` : "Signed in";
    el.hidden = false;
  }

  return { el, render };
}
