// Home-screen daily nudge: Carl must tick all three boxes before it goes away.
const AGREEMENTS = [
  "I agree to only do runs today.",
  "I agree not to build anything new.",
  "I agree to just click and review what's already there.",
];

export function showDailyReminder() {
  // One at a time — don't stack if the home screen re-mounts.
  if (document.querySelector(".daily-reminder-backdrop")) return;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop daily-reminder-backdrop";

  const modal = document.createElement("div");
  modal.className = "card modal daily-reminder";
  modal.setAttribute("role", "alertdialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "daily-reminder-title");

  modal.innerHTML = `
    <div class="modal__message h3" id="daily-reminder-title">
      Carl, you need to just do runs today. Don't build anything new.
    </div>
    <ul class="daily-reminder__checks">
      ${AGREEMENTS.map(
        (text, i) => `
        <li>
          <label class="daily-reminder__check">
            <input type="checkbox" class="js-agree" data-idx="${i}" />
            <span>${text}</span>
          </label>
        </li>`
      ).join("")}
    </ul>
    <div class="modal__actions">
      <button class="btn js-confirm" type="button" disabled>Got it</button>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const boxes = [...modal.querySelectorAll(".js-agree")];
  const confirmBtn = modal.querySelector(".js-confirm");

  function refresh() {
    confirmBtn.disabled = !boxes.every((b) => b.checked);
  }
  boxes.forEach((b) => b.addEventListener("change", refresh));

  confirmBtn.addEventListener("click", () => backdrop.remove());

  setTimeout(() => boxes[0]?.focus({ preventScroll: true }), 0);
}
