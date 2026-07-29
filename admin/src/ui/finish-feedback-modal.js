// Finish feedback modal (validation-kit Phase 3b; alpha-questions retune 2026-07-15;
// softened 2026-07-29 from Machar's corridor session, machar-fixes P1) — the ONE feedback
// moment when a logged-in manager clicks Finish on the briefing.
//
// It used to stack THREE labelled sections with button rows, which is what made it read as
// an internal QA form rather than Sero asking something. Carl caught it live over the first
// corridor manager's shoulder. It is now one question plus an optional line:
//   1. Would you use this before your next 1:1?  (Yes / No)  <- the validation pass bar
//   2. Anything get in the way?                  (one line, optional)
//
// The dropped question ("Did the prep give you something useful?") was also the run's star
// rating, mapping Yes/Sort of/No to 5/3/1. Runs therefore no longer rate themselves here;
// rating stays a deliberate act on the run detail screen (`stages/run-detail.ts`). Deriving
// stars from "would you use this again" would be inventing a rating, so it is not done.
//
// Saves fire on interaction (soft failures, never a blocker), and EVERY way out — Done,
// Not now, Escape, backdrop — resolves so Finish always proceeds. Rides the shared modal
// shell (component-consolidation P1) for the backdrop, keys and focus trap; sibling module
// because the content is custom.

import "../styles/finish-feedback-modal.css";
import { openModalShell } from "./modal-shell.ts";
import { button } from "./button.ts";
import { submitRunVerdict } from "../../../shared/api.js";

export function showFinishFeedbackModal({ sessionId }) {
  return new Promise((resolve) => {
    const shell = openModalShell({
      className: "card modal ffm",
      labelledBy: "ffm-title",
      onClose: () => close(),
      html: `
      <div class="ffm__title" id="ffm-title">One last thing.</div>
      <div class="ffm__body">
        <div class="ffm__q" id="ffm-verdict-label">Would you use this before your next 1:1?</div>
        <div class="l-cluster l-cluster--2 items-center" role="group" aria-labelledby="ffm-verdict-label">
          ${button({ label: "Yes", variant: "ghost", size: "sm", hook: "js-ffm-v", attrs: { "data-v": "yes", "aria-pressed": "false" } })}
          ${button({ label: "No", variant: "ghost", size: "sm", hook: "js-ffm-v", attrs: { "data-v": "no", "aria-pressed": "false" } })}
          <span class="js-ffm-status text-sm text-ink-mute" role="status" aria-live="polite"></span>
        </div>
        <input class="input js-ffm-note" type="text" maxlength="200" autocomplete="off"
          placeholder="Anything get in the way? Optional" aria-label="Anything get in the way?" />
      </div>
      <div class="modal__actions">
        ${button({ label: "Not now", variant: "ghost", hook: "js-ffm-skip" })}
        ${button({ label: "Done", hook: "js-ffm-done" })}
      </div>`,
    });
    const modal = shell.el;

    const status = modal.querySelector(".js-ffm-status");
    const noteInput = modal.querySelector(".js-ffm-note");
    const vBtns = [...modal.querySelectorAll(".js-ffm-v")];
    let verdict = null;

    const saveVerdict = async () => {
      if (!verdict) return;
      try {
        await submitRunVerdict(sessionId, verdict, noteInput.value.trim());
        status.textContent = "Thanks!";
      } catch {
        status.textContent = "Couldn't save. Fine to skip.";
      }
    };

    const paint = (btns, active) => btns.forEach((x) => {
      x.classList.toggle("is-active", x === active);
      x.setAttribute("aria-pressed", String(x === active));
    });

    vBtns.forEach((btn) => btn.addEventListener("click", () => {
      verdict = btn.dataset.v;
      paint(vBtns, btn);
      saveVerdict();
    }));
    noteInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && verdict) { e.preventDefault(); saveVerdict(); }
    });

    function close() {
      shell.destroy();
      resolve();
    }
    modal.querySelector(".js-ffm-skip").addEventListener("click", close);
    modal.querySelector(".js-ffm-done").addEventListener("click", async () => {
      // A typed note the user never "sent" still counts on Done — last honest sweep.
      if (verdict && noteInput.value.trim()) await saveVerdict();
      close();
    });

    setTimeout(() => modal.querySelector(".js-ffm-done")?.focus({ preventScroll: true }), 0);
  });
}
