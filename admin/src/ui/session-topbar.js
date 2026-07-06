// Fixed top-bar showing the run's stage progression. The current stage is
// bolded; the rest are muted. Completed stages are clickable — they open a
// read-only review overlay (the live run itself stays one-way; reviewing never
// navigates back).
// Left-anchored Session button opens a popover to save & exit or delete.
// Mounted once in main.js, kept in sync by the store subscribe callback.

import { STAGES } from "../state.js";
import { deleteRun } from "../../../shared/api.js";
import { confirmAction } from "./confirm.js";
import { TOPBAR_STAGES } from "./stage-labels.js";
import { createGlossaryButton } from "./glossary.js";
import { createStageReview } from "./stage-review.js";

// The stage breadcrumb is meaningful only while a run is in progress or just
// finished. Everything else — home, the standalone tools/library, errors —
// shows just the app nav. Allowlist by design: new standalone screens stay
// single-bar without needing to be enumerated here.
const RUN_STAGES = new Set([
  ...TOPBAR_STAGES.map(([key]) => key), // INTAKE … BRIEFING
  STAGES.RUN_DEBRIEF,                   // post-run review
]);

// First letter of the name (or email) for the initials circle — same rule as
// the top-right profile badge (ui/profile-badge.js).
function initialOf(user) {
  const src = (user?.name || user?.email || "").trim();
  return src ? src[0].toUpperCase() : "?";
}

// Plain-words role for the chip — mirrors ui/profile-badge.js.
function roleLabelOf(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : user?.role ? [user.role] : [];
  if (roles.includes("admin")) return "Admin";
  if (roles.includes("manager")) return "Manager";
  if (roles.includes("member")) return "Member";
  return "";
}

export function createSessionTopbar({ store, setState, resetSession } = {}) {
  const stageReview = createStageReview({ store });
  const el = document.createElement("div");
  el.className = "session-topbar";

  const row = document.createElement("div");
  row.className = "session-topbar__row session-topbar__row--main";
  el.appendChild(row);

  const sessionBtn = document.createElement("button");
  sessionBtn.className = "session-topbar__start";
  sessionBtn.type = "button";
  sessionBtn.textContent = "Session";
  sessionBtn.setAttribute("aria-haspopup", "menu");
  sessionBtn.setAttribute("aria-expanded", "false");
  row.appendChild(sessionBtn);

  const stages = document.createElement("div");
  stages.className = "session-topbar__stages";
  stages.setAttribute("aria-label", "Run progress");
  row.appendChild(stages);

  // Who's signed in — an initials circle + email, in the spot the old
  // "Step X of 7" counter used to sit (the run breadcrumb already shows progress).
  const profile = document.createElement("span");
  profile.className = "session-topbar__profile";
  profile.innerHTML = `
    <span class="session-topbar__avatar" aria-hidden="true"></span>
    <span class="session-topbar__email"></span>
  `;
  const profileAvatar = profile.querySelector(".session-topbar__avatar");
  const profileEmail = profile.querySelector(".session-topbar__email");
  row.appendChild(profile);

  const glossaryBtn = createGlossaryButton();
  row.appendChild(glossaryBtn);

  document.body.classList.add("has-session-topbar");

  let popover = null;
  let outsideHandler = null;
  let escHandler = null;

  function closePopover() {
    if (popover) { popover.remove(); popover = null; }
    if (outsideHandler) { document.removeEventListener("mousedown", outsideHandler); outsideHandler = null; }
    if (escHandler) { document.removeEventListener("keydown", escHandler); escHandler = null; }
    sessionBtn.setAttribute("aria-expanded", "false");
  }

  function openPopover() {
    closePopover();
    popover = document.createElement("div");
    popover.className = "start-popover";
    popover.setAttribute("role", "menu");
    popover.innerHTML = `
      <button class="js-save" type="button" role="menuitem">Save and exit</button>
      <button class="js-delete is-danger" type="button" role="menuitem">Delete session and logs</button>
    `;
    document.body.appendChild(popover);
    sessionBtn.setAttribute("aria-expanded", "true");

    const rect = sessionBtn.getBoundingClientRect();
    // Clamp to the viewport — at phone widths an unclamped popover can hang off-screen.
    popover.style.left = `${Math.round(Math.max(8, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 8)))}px`;

    popover.querySelector(".js-save").addEventListener("click", () => {
      closePopover();
      saveAndExit();
    });
    popover.querySelector(".js-delete").addEventListener("click", () => {
      closePopover();
      deleteAndExit();
    });

    outsideHandler = (e) => {
      if (popover && !popover.contains(e.target) && e.target !== sessionBtn) closePopover();
    };
    escHandler = (e) => { if (e.key === "Escape") closePopover(); };
    setTimeout(() => {
      document.addEventListener("mousedown", outsideHandler);
      document.addEventListener("keydown", escHandler);
    }, 0);
  }

  function saveAndExit() {
    try { localStorage.removeItem("seroSessionId"); } catch {}
    if (resetSession) resetSession();
    setState && setState({ stage: STAGES.START });
  }

  async function deleteAndExit() {
    const ok = await confirmAction({
      message: "Delete this session permanently? This cannot be undone.",
      confirmLabel: "Delete session",
      cancelLabel: "Keep session",
      destructive: true,
    });
    if (!ok) return;
    const id = store && store.sessionId;
    if (id) {
      try { await deleteRun(id); } catch (e) { console.warn("[topbar] delete failed:", e); }
    }
    try { localStorage.removeItem("seroSessionId"); } catch {}
    if (resetSession) resetSession();
    setState && setState({ stage: STAGES.START });
  }

  sessionBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (sessionBtn.disabled) return;
    if (popover) closePopover(); else openPopover();
  });

  function render({ stage, sessionId, user } = {}) {
    const current = String(stage || "");
    // The Phrase library is dual-use: part of the run when there's a live
    // session, a standalone tool when opened from the nav. Only the in-run case
    // gets the breadcrumb.
    const inRun = RUN_STAGES.has(current) || (current === STAGES.LEXICON_REVIEW && !!sessionId);

    if (!inRun) {
      el.classList.add("is-hidden");
      document.body.classList.remove("has-session-topbar");
      if (popover) closePopover();
      stageReview.close();
      return;
    }

    const order = TOPBAR_STAGES.map(([key]) => key);
    const curIdx = order.indexOf(current);

    const email = user?.email || "";
    const role = roleLabelOf(user);
    profileAvatar.textContent = initialOf(user);
    profileEmail.textContent = role ? `${email} · ${role}` : email;
    profile.title = email ? `Signed in as ${email}${role ? ` (${role.toLowerCase()})` : ""}` : "";
    profile.hidden = !user;

    stages.innerHTML = TOPBAR_STAGES
      .map(
        ([key, fullLabel, shortLabel], i) => {
          const label = window.matchMedia("(min-width: 768px)").matches ? fullLabel : shortLabel;
          // Stages before the current one are "done" (reviewable); the current
          // stage is "current"; anything after is "upcoming". When the run has
          // moved past the board (curIdx === -1, e.g. session review), every
          // stage is done.
          const status = curIdx === -1 || i < curIdx ? "done" : i === curIdx ? "current" : "upcoming";
          const sep = i > 0 ? '<span class="sep" aria-hidden="true">·</span>' : "";
          if (status === "done") {
            return `${sep}<button type="button" class="stage-step--clickable is-done" data-stage="${key}" title="${fullLabel}">${label}</button>`;
          }
          return `${sep}<span class="is-${status}" title="${fullLabel}">${label}</span>`;
        }
      )
      .join("");

    stages.querySelectorAll(".stage-step--clickable").forEach((btn) => {
      btn.addEventListener("click", () => stageReview.open(btn.dataset.stage));
    });
    el.classList.remove("is-hidden");
    document.body.classList.add("has-session-topbar");

    const noSession = !sessionId;
    sessionBtn.disabled = noSession;
    glossaryBtn.hidden = false;
    if (popover && noSession) closePopover();
  }

  return { el, render };
}
