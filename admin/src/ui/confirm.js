function getFocusables(root) {
  return Array.from(
    root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

function openDialog({
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  alert = false,
} = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "card modal";
    modal.setAttribute("role", alert ? "alertdialog" : "dialog");
    modal.setAttribute("aria-modal", "true");

    const titleId = `modal-title-${Date.now()}`;
    modal.innerHTML = `
      <div class="modal__message" id="${titleId}"></div>
      <div class="modal__actions">
        ${alert ? "" : `<button class="btn btn--ghost js-cancel" type="button"></button>`}
        <button class="btn ${destructive ? "btn--danger" : ""} js-confirm" type="button"></button>
      </div>
    `;
    modal.setAttribute("aria-labelledby", titleId);
    modal.querySelector(".modal__message").textContent = message || "Are you sure?";
    const cancelBtn = modal.querySelector(".js-cancel");
    const confirmBtn = modal.querySelector(".js-confirm");
    if (cancelBtn) cancelBtn.textContent = cancelLabel;
    confirmBtn.textContent = alert ? confirmLabel : confirmLabel;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const previouslyFocused = document.activeElement;

    function close(result) {
      document.removeEventListener("keydown", onKey, true);
      modal.removeEventListener("keydown", trapTab);
      backdrop.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus({ preventScroll: true });
      }
      resolve(result);
    }

    function trapTab(e) {
      if (e.key !== "Tab") return;
      const focusables = getFocusables(modal);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(alert ? undefined : false);
      } else if (e.key === "Enter" && document.activeElement === confirmBtn) {
        e.preventDefault();
        e.stopPropagation();
        close(alert ? undefined : true);
      }
    }

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close(alert ? undefined : false);
    });
    if (cancelBtn) cancelBtn.addEventListener("click", () => close(false));
    confirmBtn.addEventListener("click", () => close(alert ? undefined : true));
    document.addEventListener("keydown", onKey, true);
    modal.addEventListener("keydown", trapTab);

    setTimeout(() => {
      if (destructive && cancelBtn) cancelBtn.focus({ preventScroll: true });
      else confirmBtn.focus({ preventScroll: true });
    }, 0);
  });
}

export function confirmAction(opts = {}) {
  return openDialog({ ...opts, alert: false });
}

export function alertAction({ message, confirmLabel = "OK" } = {}) {
  return openDialog({ message, confirmLabel, alert: true });
}
