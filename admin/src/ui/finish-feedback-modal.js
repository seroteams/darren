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
// Rides the shared modal shell (component-consolidation P1) for the backdrop, keys and
// focus trap; sibling module because the content is custom.

import "../styles/finish-feedback-modal.css";
import { openModalShell } from "./modal-shell.ts";
import { button } from "./button.ts";
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
    const shell = openModalShell({
      className: "card modal ffm",
      labelledBy: "ffm-title",
      onClose: () => close(),
      html: `
      <div class="ffm__title" id="ffm-title">Before you go. </div>
      <div class="ffm__sec">
        <div class="eyebrow" id="ffm-useful-label">Did the prep give you something useful?</div>
        <div class="l-cluster l-cluster--2 items-center" role="group" aria-labelledby="ffm-useful-label">
          ${button({ label: "Yes", variant: "ghost", size: "sm", hook: "js-ffm-u", attrs: { "data-u": "Yes", "aria-pressed": "false" } })}
          ${button({ label: "Sort of", variant: "ghost", size: "sm", hook: "js-ffm-u", attrs: { "data-u": "Sort of", "aria-pressed": "false" } })}
          ${button({ label: "No", variant: "ghost", size: "sm", hook: "js-ffm-u", attrs: { "data-u": "No", "aria-pressed": "false" } })}
          <span class="js-ffm-status text-sm text-ink-mute" role="status" aria-live="polite"></span>
        </div>
      </div>
      <div class="ffm__sec">
        <div class="eyebrow" id="ffm-verdict-label">Would you use this before your next 1:1?</div>
        <div class="l-cluster l-cluster--2 items-center" role="group" aria-labelledby="ffm-verdict-label">
          ${button({ label: "Yes", variant: "ghost", size: "sm", hook: "js-ffm-v", attrs: { "data-v": "yes", "aria-pressed": "false" } })}
          ${button({ label: "No", variant: "ghost", size: "sm", hook: "js-ffm-v", attrs: { "data-v": "no", "aria-pressed": "false" } })}
        </div>
      </div>
      <div class="ffm__sec">
        <div class="eyebrow" id="ffm-stuck-label">Where did you get stuck or confused?</div>
        <input class="input js-ffm-note" type="text" maxlength="200" autocomplete="off"
          placeholder="One line. Optional" aria-labelledby="ffm-stuck-label" />
      </div>
      <div class="modal__actions">
        ${button({ label: "Skip", variant: "ghost", hook: "js-ffm-skip" })}
        ${button({ label: "Done", hook: "js-ffm-done" })}
      </div>`,
    });
    const modal = shell.el;

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
        status.textContent = "Couldn't save. Fine to skip.";
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
        status.textContent = "You can rate it later from Past 1:1s.";
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
