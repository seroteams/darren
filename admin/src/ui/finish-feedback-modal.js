// Finish feedback modal (validation-kit Phase 3b; alpha-questions retune 2026-07-15) —
// the ONE feedback moment when a logged-in manager clicks Finish on the briefing. It now
// asks the three alpha test-drive questions verbatim, so the answers land in the Feedback
// inbox instead of relying on an email reply:
//   1. Did the prep give you something useful?  (Yes / Sort of / No)
//   2. Would you use this before your next 1:1?  (Yes / No)
//   3. Where did you get stuck or confused?      (one line)
// Q1 rides `rateMyRun` (Yes/Sort of/No -> 5/3/1) so the run rating + admin-ratings stay
// fed; Q2 is the verdict; Q1+Q3 pack into the verdict message so all three show on one
// inbox row — no DB change. Saves fire on interaction (soft failures, never a blocker),
// and EVERY way out — Done, Skip, Escape, backdrop — resolves so Finish always proceeds.
// Reuses confirm.js's backdrop/focus-trap pattern and the shared .modal-backdrop/.card
// .modal styles; sibling module because the content is custom.

import "../styles/finish-feedback-modal.css";
import { rateMyRun, submitRunVerdict } from "../../../shared/api.js";

// Q1 answer <-> star rating, so the numeric rating signal (and admin-ratings) stays fed.
const STARS_FOR = { Yes: 5, "Sort of": 3, No: 1 };
function usefulFromStars(stars) {
  if (stars >= 4) return "Yes";
  if (stars >= 2) return "Sort of";
  if (stars >= 1) return "No";
  return null;
}

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
        <div class="eyebrow" id="ffm-useful-label">Did the prep give you something useful?</div>
        <div class="l-cluster l-cluster--2 items-center" role="group" aria-labelledby="ffm-useful-label">
          <button type="button" class="btn btn--ghost btn--sm js-ffm-u" data-u="Yes" aria-pressed="false">Yes</button>
          <button type="button" class="btn btn--ghost btn--sm js-ffm-u" data-u="Sort of" aria-pressed="false">Sort of</button>
          <button type="button" class="btn btn--ghost btn--sm js-ffm-u" data-u="No" aria-pressed="false">No</button>
          <span class="js-ffm-status text-sm text-ink-mute" role="status" aria-live="polite"></span>
        </div>
      </div>
      <div class="ffm__sec">
        <div class="eyebrow" id="ffm-verdict-label">Would you use this before your next 1:1?</div>
        <div class="l-cluster l-cluster--2 items-center" role="group" aria-labelledby="ffm-verdict-label">
          <button type="button" class="btn btn--ghost btn--sm js-ffm-v" data-v="yes" aria-pressed="false">Yes</button>
          <button type="button" class="btn btn--ghost btn--sm js-ffm-v" data-v="no" aria-pressed="false">No</button>
        </div>
      </div>
      <div class="ffm__sec">
        <div class="eyebrow" id="ffm-stuck-label">Where did you get stuck or confused?</div>
        <input class="input js-ffm-note" type="text" maxlength="200" autocomplete="off"
          placeholder="One line — optional" aria-labelledby="ffm-stuck-label" />
      </div>
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost js-ffm-skip">Skip</button>
        <button type="button" class="btn js-ffm-done">Done</button>
      </div>`;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const status = modal.querySelector(".js-ffm-status");
    const noteInput = modal.querySelector(".js-ffm-note");
    const uBtns = [...modal.querySelectorAll(".js-ffm-u")];
    const vBtns = [...modal.querySelectorAll(".js-ffm-v")];
    let useful = usefulFromStars(initialStars); // pre-fill from an earlier rating, if any
    let verdict = null;

    // Q1 + Q3 packed so both show on the inbox verdict row (Q2 is the yes/no chip).
    const composeMessage = () => {
      const parts = [];
      if (useful) parts.push(`Useful: ${useful}`);
      const stuck = noteInput.value.trim();
      if (stuck) parts.push(`Stuck: ${stuck}`);
      return parts.join(" · ");
    };

    const saveVerdict = async () => {
      if (!verdict) return;
      try {
        await submitRunVerdict(sessionId, verdict, composeMessage());
        status.textContent = "Thanks!";
      } catch {
        status.textContent = "Couldn't save — fine to skip.";
      }
    };

    const paint = (btns, active) => btns.forEach((x) => {
      x.classList.toggle("is-active", x === active);
      x.setAttribute("aria-pressed", String(x === active));
    });

    if (useful) paint(uBtns, uBtns.find((b) => b.dataset.u === useful) ?? null);

    uBtns.forEach((btn) => btn.addEventListener("click", async () => {
      useful = btn.dataset.u;
      paint(uBtns, btn);
      try {
        await rateMyRun(sessionId, { stars: STARS_FOR[useful] });
        status.textContent = "Thanks!";
      } catch {
        status.textContent = "You can rate it later from Runs.";
      }
      // Keep the inbox row's "Useful:" in step once a verdict exists.
      if (verdict) saveVerdict();
    }));

    vBtns.forEach((btn) => btn.addEventListener("click", () => {
      verdict = btn.dataset.v;
      paint(vBtns, btn);
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
      // A typed note the user never "sent" still counts on Done — last honest sweep.
      if (verdict && noteInput.value.trim()) await saveVerdict();
      close();
    });
    document.addEventListener("keydown", onKey, true);

    setTimeout(() => modal.querySelector(".js-ffm-done")?.focus({ preventScroll: true }), 0);
  });
}
