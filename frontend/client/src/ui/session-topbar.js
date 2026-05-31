// Fixed top-bar showing the run's stage progression. The current stage is
// bolded; the rest are muted. Stages are visual indicators only — not
// clickable navigation (the run is intentionally one-way).
// Left-anchored "Start" button opens a popover to save & exit or delete.
// Mounted once in main.js, kept in sync by the store subscribe callback.

import { STAGES } from "../state.js";
import { deleteRun } from "../api.js";
import { confirmAction } from "./confirm.js";

const STAGE_ORDER = [
  ["INTAKE", "Intake", "Intake"],
  ["FOCUS_POINTS", "Focus points", "Focus"],
  ["PREPARATION", "Preparation", "Prep"],
  ["BANK", "Question bank", "Bank"],
  ["QUESTIONING", "Questioning", "Q&A"],
  ["EVAL", "Evaluation", "Eval"],
  ["BRIEFING", "Briefing", "Brief"],
];

export function createSessionTopbar({ store, setState, resetSession } = {}) {
  const el = document.createElement("div");
  el.className = "session-topbar";

  const row = document.createElement("div");
  row.className = "session-topbar__row session-topbar__row--main";
  el.appendChild(row);

  const startBtn = document.createElement("button");
  startBtn.className = "session-topbar__start";
  startBtn.type = "button";
  startBtn.textContent = "Start";
  startBtn.setAttribute("aria-haspopup", "menu");
  startBtn.setAttribute("aria-expanded", "false");
  row.appendChild(startBtn);

  const stages = document.createElement("div");
  stages.className = "session-topbar__stages";
  stages.setAttribute("aria-label", "Run progress");
  row.appendChild(stages);

  document.body.classList.add("has-session-topbar");

  let popover = null;
  let outsideHandler = null;
  let escHandler = null;

  function closePopover() {
    if (popover) { popover.remove(); popover = null; }
    if (outsideHandler) { document.removeEventListener("mousedown", outsideHandler); outsideHandler = null; }
    if (escHandler) { document.removeEventListener("keydown", escHandler); escHandler = null; }
    startBtn.setAttribute("aria-expanded", "false");
  }

  function openPopover() {
    closePopover();
    popover = document.createElement("div");
    popover.className = "start-popover";
    popover.setAttribute("role", "menu");
    popover.innerHTML = `
      <button class="js-save" type="button" role="menuitem">Save and exit</button>
      <button class="js-delete is-danger" type="button" role="menuitem">Exit and delete session</button>
    `;
    document.body.appendChild(popover);
    startBtn.setAttribute("aria-expanded", "true");

    const rect = startBtn.getBoundingClientRect();
    popover.style.left = `${Math.round(rect.left)}px`;

    popover.querySelector(".js-save").addEventListener("click", () => {
      closePopover();
      saveAndExit();
    });
    popover.querySelector(".js-delete").addEventListener("click", () => {
      closePopover();
      deleteAndExit();
    });

    outsideHandler = (e) => {
      if (popover && !popover.contains(e.target) && e.target !== startBtn) closePopover();
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

  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (startBtn.disabled) return;
    if (popover) closePopover(); else openPopover();
  });

  function render({ stage, sessionId } = {}) {
    const current = String(stage || "");
    stages.innerHTML = STAGE_ORDER
      .map(
        ([key, fullLabel, shortLabel], i) =>
          `${i > 0 ? '<span class="sep" aria-hidden="true">·</span>' : ""}<span class="${key === current ? "is-current" : ""}" title="${fullLabel}">${shortLabel}</span>`
      )
      .join("");
    el.classList.remove("is-hidden");
    document.body.classList.add("has-session-topbar");

    const onStart = current === STAGES.START;
    const noSession = !sessionId;
    startBtn.disabled = onStart || noSession;
    if (popover && (onStart || noSession)) closePopover();
  }

  return { el, render };
}
