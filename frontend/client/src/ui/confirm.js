export function confirmAction({ message, confirmLabel = "Confirm", cancelLabel = "Cancel" } = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "card modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="modal__message"></div>
      <div class="modal__actions">
        <button class="btn btn--ghost js-cancel" type="button"></button>
        <button class="btn js-confirm" type="button"></button>
      </div>
    `;
    modal.querySelector(".modal__message").textContent = message || "Are you sure?";
    modal.querySelector(".js-cancel").textContent = cancelLabel;
    modal.querySelector(".js-confirm").textContent = confirmLabel;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const confirmBtn = modal.querySelector(".js-confirm");
    const cancelBtn = modal.querySelector(".js-cancel");

    function close(result) {
      document.removeEventListener("keydown", onKey, true);
      backdrop.remove();
      resolve(result);
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        close(true);
      }
    }

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close(false);
    });
    cancelBtn.addEventListener("click", () => close(false));
    confirmBtn.addEventListener("click", () => close(true));
    document.addEventListener("keydown", onKey, true);

    setTimeout(() => confirmBtn.focus({ preventScroll: true }), 0);
  });
}
