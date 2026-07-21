// Fixed top-bar showing the run's stage progression. The current stage is
// bolded; the rest are muted. Completed stages are clickable — they open a
// read-only review overlay (the live run itself stays one-way; reviewing never
// navigates back).
// Left-anchored Session button opens a popover to save & exit or delete.
// Mounted once in main.js, kept in sync by the store subscribe callback.

import { Check } from "lucide";
import { STAGES } from "../state.js";
import { exitStage } from "./landing.ts";
import { deleteRun } from "../../../shared/api.js";
import { confirmAction } from "./confirm.js";
import { TOPBAR_STAGES } from "./stage-labels.js";
import { createStageReview } from "./stage-review.js";
import { icon } from "./icon.js";

// Rendered once — the check that marks a completed, reviewable stage.
const CHECK_MARK = icon(Check, { size: 16, className: "stage-step__check" });

// Sero mark for the guest run. A logged-out visitor taking a "try it" run has no
// left nav rail (it's hidden for guests), so nothing carries the brand — this
// puts the logo at the far top-left until they sign in. Same glyph as app-nav.js.
const LOGO = `<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true" focusable="false">
  <rect width="48" height="48" rx="12" fill="var(--color-ink)"/>
  <rect x="9" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <rect x="32.5" y="12" width="6.5" height="24" rx="3.25" fill="#fff"/>
  <circle cx="24" cy="18.5" r="5" fill="#fff"/>
  <circle cx="24" cy="31" r="5" fill="#fff"/>
</svg>`;

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
  // Mount HIDDEN: whether a run is live is only known once boot's async auth
  // check resolves. Starting visible painted a stray "This 1:1" bar over the
  // blank page for the whole auth round-trip on first load — same fix as the
  // nav rail (ui/app-nav.js). render() reveals it when a run stage is on.
  el.className = "session-topbar is-hidden";

  const row = document.createElement("div");
  row.className = "session-topbar__row session-topbar__row--main";
  el.appendChild(row);

  // Guest-only brand mark, first thing on the row (far top-left). Hidden by
  // default; render() shows it only when there's no signed-in user. Clicking it
  // sends the guest to the login screen.
  const brand = document.createElement("button");
  brand.type = "button";
  brand.className = "session-topbar__brand";
  brand.setAttribute("aria-label", "Sero. Go to login");
  brand.hidden = true;
  brand.innerHTML = `<span class="session-topbar__brand-icon">${LOGO}</span><span class="session-topbar__brand-word">Sero</span>`;
  brand.addEventListener("click", () => setState && setState({ stage: STAGES.LOGIN }));
  row.appendChild(brand);

  const sessionBtn = document.createElement("button");
  sessionBtn.className = "session-topbar__start";
  sessionBtn.type = "button";
  sessionBtn.textContent = "This 1:1";
  sessionBtn.setAttribute("aria-haspopup", "menu");
  sessionBtn.setAttribute("aria-expanded", "false");
  row.appendChild(sessionBtn);

  const stages = document.createElement("div");
  stages.className = "session-topbar__stages";
  stages.setAttribute("aria-label", "1:1 progress");
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

  // No eager has-session-topbar here: render() adds/removes it alongside
  // is-hidden, so the body class and the bar can never disagree during boot.

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
      <button class="js-delete is-danger" type="button" role="menuitem">Delete this 1:1</button>
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
    setState && setState({ stage: exitStage(store.user, store.memberHome, store.guestHome) });
  }

  async function deleteAndExit() {
    const ok = await confirmAction({
      message: "Delete this 1:1 permanently? This cannot be undone.",
      confirmLabel: "Delete 1:1",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    const id = store && store.sessionId;
    if (id) {
      try { await deleteRun(id); } catch (e) { console.warn("[topbar] delete failed:", e); }
    }
    try { localStorage.removeItem("seroSessionId"); } catch {}
    if (resetSession) resetSession();
    setState && setState({ stage: exitStage(store.user, store.memberHome, store.guestHome) });
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
    // The setup step (INTAKE) is pre-run: no stage breadcrumb until the 1:1
    // actually starts (FOCUS_POINTS onward). Setup carries its own "Cancel setup".
    const inRun =
      current !== STAGES.INTAKE &&
      (RUN_STAGES.has(current) || (current === STAGES.LEXICON_REVIEW && !!sessionId));

    if (!inRun) {
      el.classList.add("is-hidden");
      document.body.classList.remove("has-session-topbar");
      if (popover) closePopover();
      stageReview.close();
      return;
    }

    const order = TOPBAR_STAGES.map(([key]) => key);
    const curIdx = order.indexOf(current);

    // Guest (no account) run: show the Sero mark far-left, and drop the topbar's
    // left rail-gutter so it sits at the true edge (there's no nav rail for a guest).
    const isGuest = !user;
    brand.hidden = !isGuest;
    el.classList.toggle("session-topbar--guest", isGuest);

    const email = user?.email || "";
    const role = roleLabelOf(user);
    profileAvatar.textContent = initialOf(user);
    profileEmail.textContent = role ? `${email} · ${role}` : email;
    profile.title = email ? `Signed in as ${email}${role ? ` (${role.toLowerCase()})` : ""}` : "";
    profile.hidden = !user;

    stages.innerHTML = TOPBAR_STAGES
      .map(
        ([key, fullLabel, shortLabel], i) => {
          // Full labels only where they genuinely fit (audit M5). The human stage names
          // ("During the meeting", "Pulling it together") are longer than the old engine ones,
          // so the full strip needs a wide screen; between phone and wide we use the short
          // form rather than let the rail clip letters or slide under the profile chip. The
          // full name still rides on the title attribute at every width.
          const label = window.matchMedia("(min-width: 1180px)").matches ? fullLabel : shortLabel;
          // Stages before the current one are "done" (reviewable); the current
          // stage is "current"; anything after is "upcoming". When the run has
          // moved past the board (curIdx === -1, e.g. session review), every
          // stage is done.
          const status = curIdx === -1 || i < curIdx ? "done" : i === curIdx ? "current" : "upcoming";
          // The rail leading into this step is "filled" once the step is reached
          // (done or current), grey while it's still ahead — a progress track.
          const railFilled = curIdx === -1 || i <= curIdx;
          const rail = i > 0
            ? `<span class="stage-rail ${railFilled ? "is-filled" : "is-empty"}" aria-hidden="true"></span>`
            : "";
          const inner = `${status === "done" ? CHECK_MARK : '<span class="stage-step__dot" aria-hidden="true"></span>'}<span class="stage-step__label">${label}</span>`;
          if (status === "done") {
            return `${rail}<button type="button" class="stage-step is-done stage-step--clickable" data-stage="${key}" title="${fullLabel}">${inner}</button>`;
          }
          return `${rail}<span class="stage-step is-${status}" title="${fullLabel}">${inner}</span>`;
        }
      )
      .join("");

    // Phone-only progress cue: at 375px the rail collapses to just the current
    // pill, so a "5 of 7" counter carries the sense of place the rail can't.
    const total = TOPBAR_STAGES.length;
    const pos = curIdx === -1 ? total : curIdx + 1;
    stages.insertAdjacentHTML(
      "beforeend",
      `<span class="session-topbar__count" aria-hidden="true">${pos} of ${total}</span>`,
    );

    stages.querySelectorAll(".stage-step--clickable").forEach((btn) => {
      btn.addEventListener("click", () => stageReview.open(btn.dataset.stage));
    });
    el.classList.remove("is-hidden");
    document.body.classList.add("has-session-topbar");

    const noSession = !sessionId;
    sessionBtn.disabled = noSession;
    if (popover && noSession) closePopover();
  }

  return { el, render };
}
