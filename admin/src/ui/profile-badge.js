// Profile badge — a small chip pinned top-right showing who's signed in (an initial
// circle + the email). Members only: it's the at-a-glance "which account am I in" for
// the manager app. Hidden for admins (they don't need it), on the auth screens, and
// during the in-session prep flow (where the stage topbar + notes panel own the top).
// Mounted once in main.js; render({ stage, user }) keeps it in sync, same as app-nav.

import { STAGES, isAdmin } from "../state.js";
import { isFlowStage } from "../router.js";

// First letter of the name, falling back to the email — the glyph in the circle.
function initialOf(user) {
  const src = (user?.name || user?.email || "").trim();
  return src ? src[0].toUpperCase() : "?";
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
      !isAdmin(user) &&
      stage !== STAGES.LOGIN &&
      stage !== STAGES.REGISTER &&
      !isFlowStage(stage);
    if (!show) {
      el.hidden = true;
      return;
    }
    const email = user.email || "";
    avatarEl.textContent = initialOf(user);
    emailEl.textContent = email;
    el.title = email ? `Signed in as ${email}` : "Signed in";
    el.hidden = false;
  }

  return { el, render };
}
