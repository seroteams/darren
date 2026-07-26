// The generic confirm / alert dialog. Content only — the backdrop, Escape, Tab trap
// and focus restore all come from the shared modal shell (component-consolidation P1).

import { openModalShell } from "./modal-shell.ts";

function openDialog({
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  alert = false,
} = {}) {
  return new Promise((resolve) => {
    const titleId = `modal-title-${Date.now()}`;

    const shell = openModalShell({
      className: "card modal",
      role: alert ? "alertdialog" : "dialog",
      labelledBy: titleId,
      html: `
      <div class="modal__message" id="${titleId}"></div>
      <div class="modal__actions">
        ${alert ? "" : `<button class="btn btn--ghost js-cancel" type="button"></button>`}
        <button class="btn ${destructive ? "btn--danger" : ""} js-confirm" type="button"></button>
      </div>
    `,
      onClose: () => close(alert ? undefined : false),
    });

    const modal = shell.el;
    modal.querySelector(".modal__message").textContent = message || "Are you sure?";
    const cancelBtn = modal.querySelector(".js-cancel");
    const confirmBtn = modal.querySelector(".js-confirm");
    if (cancelBtn) cancelBtn.textContent = cancelLabel;
    confirmBtn.textContent = confirmLabel;

    function close(result) {
      document.removeEventListener("keydown", onEnter, true);
      shell.destroy();
      resolve(result);
    }

    // Enter on the confirm button resolves. Escape is the shell's job.
    function onEnter(e) {
      if (e.key !== "Enter" || document.activeElement !== confirmBtn) return;
      e.preventDefault();
      e.stopPropagation();
      close(alert ? undefined : true);
    }

    if (cancelBtn) cancelBtn.addEventListener("click", () => close(false));
    confirmBtn.addEventListener("click", () => close(alert ? undefined : true));
    document.addEventListener("keydown", onEnter, true);

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
