// Finish feedback modal (validation-kit Phase 3b) — the ONE feedback moment when a
// logged-in manager clicks Finish on the briefing: the star rating and the verdict
// question ("Would you run this 1:1 differently now?") together, instead of two
// cards stacked on the page. Saves fire on interaction (soft failures, never a
// blocker), and EVERY way out — Done, Skip, Escape, backdrop — resolves so Finish
// always proceeds. Reuses confirm.js's backdrop/focus-trap pattern and the shared
// .modal-backdrop/.card.modal styles; sibling module because the content is custom.

import "../styles/finish-feedback-modal.css";
import { rateMyRun, submitRunVerdict } from "../../../shared/api.js";
import { createStarRating } from "./star-rating.js";

export function showFinishFeedbackModal({ sessionId, initialStars = 0 }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "card modal ffm";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "ffm-title");
    modal.innerHTML = `
      <div class="ffm__title" id="ffm-title">Before you go —</div>
      <div class="ffm__sec">
        <div class="eyebrow">Did this help you run the 1:1?</div>
        <div class="l-cluster l-cluster--2 items-center">
          <span class="js-ffm-stars"></span>
          <span class="js-ffm-status text-sm text-ink-mute" role="status" aria-live="polite"></span>
        </div>
      </div>
      <div class="ffm__sec">
        <div class="eyebrow" id="ffm-verdict-label">Would you run this 1:1 differently now?</div>
        <div class="l-cluster l-cluster--2 items-center" role="group" aria-labelledby="ffm-verdict-label">
          <button type="button" class="btn btn--ghost btn--sm js-ffm-v" data-v="yes" aria-pressed="false">Yes</button>
          <button type="button" class="btn btn--ghost btn--sm js-ffm-v" data-v="no" aria-pressed="false">No</button>
        </div>
        <input class="input js-ffm-note" type="text" maxlength="200" autocomplete="off"
          placeholder="One line on why — optional" aria-label="Optional comment" />
      </div>
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost js-ffm-skip">Skip</button>
        <button type="button" class="btn js-ffm-done">Done</button>
      </div>`;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const status = modal.querySelector(".js-ffm-status");
    const noteInput = modal.querySelector(".js-ffm-note");
    const vBtns = [...modal.querySelectorAll(".js-ffm-v")];
    let verdict = null;

    const stars = createStarRating({
      initialStars,
      onChange: async (s) => {
        try {
          await rateMyRun(sessionId, { stars: s });
          status.textContent = "Thanks!";
        } catch {
          status.textContent = "You can rate it later from Runs.";
        }
      },
    });
    modal.querySelector(".js-ffm-stars").appendChild(stars.el);

    const saveVerdict = async () => {
      if (!verdict) return;
      try {
        await submitRunVerdict(sessionId, verdict, noteInput.value.trim());
        status.textContent = "Thanks!";
      } catch {
        status.textContent = "Couldn't save — fine to skip.";
      }
    };
    vBtns.forEach((btn) => btn.addEventListener("click", () => {
      verdict = btn.dataset.v;
      vBtns.forEach((x) => {
        x.classList.toggle("is-active", x === btn);
        x.setAttribute("aria-pressed", String(x === btn));
      });
      saveVerdict();
    }));
    noteInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && verdict) { e.preventDefault(); saveVerdict(); }
    });

    const previouslyFocused = document.activeElement;
    function close() {
      document.removeEventListener("keydown", onKey, true);
      backdrop.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus({ preventScroll: true });
      }
      resolve();
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      if (e.key !== "Tab") return;
      // Keep Tab inside the dialog (same trap as confirm.js).
      const focusables = Array.from(modal.querySelectorAll("button:not([disabled]), input:not([disabled])"));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
    modal.querySelector(".js-ffm-skip").addEventListener("click", close);
    modal.querySelector(".js-ffm-done").addEventListener("click", async () => {
      // A typed comment the user never "sent" still counts on Done — last honest sweep.
      if (verdict && noteInput.value.trim()) await saveVerdict();
      close();
    });
    document.addEventListener("keydown", onKey, true);

    setTimeout(() => modal.querySelector(".js-ffm-done")?.focus({ preventScroll: true }), 0);
  });
}
