// "Delete this person?" modal — the destructive confirm for a hard delete. Deleting a
// person permanently wipes them AND every 1:1 about them (see people.service.remove), so
// this gates the action behind a type-the-exact-name step, GitHub-style: the Delete button
// stays disabled until the manager retypes the name. Rides the shared .modal-backdrop /
// .card.modal base + add-person-modal.css (the .apm--danger variant); resolves true only
// on a confirmed delete, false on any way out (Cancel, Escape, backdrop).

import "../styles/add-person-modal.css";
import { openModalShell } from "./modal-shell.ts";
import { nameMatches } from "./add-person-form.ts";

export function showDeletePersonModal(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const shell = openModalShell({
      className: "card modal apm apm--danger",
      role: "alertdialog",
      labelledBy: "del-person-title",
      onClose: () => close(false),
      html: `
      <div class="apm__head">
        <div class="apm__title" id="del-person-title"></div>
        <div class="apm__sub apm__warn"></div>
      </div>
      <div class="apm__body">
        <div class="apm-field">
          <label class="apm-field__label" for="del-confirm"></label>
          <input class="apm-field__input js-confirm" id="del-confirm" type="text" autocomplete="off"
                 spellcheck="false" />
        </div>
      </div>
      <div class="apm__foot">
        <button type="button" class="btn btn--ghost js-cancel">Cancel</button>
        <button type="button" class="btn btn--danger js-delete" disabled>Delete permanently</button>
      </div>`,
    });
    const modal = shell.el;

    // textContent (never innerHTML) so the person's own name can't inject markup.
    modal.querySelector<HTMLElement>(".apm__title")!.textContent = `Delete ${name}?`;
    modal.querySelector<HTMLElement>(".apm__warn")!.textContent =
      `This permanently deletes ${name} and every 1:1 about them. This can't be undone.`;
    modal.querySelector<HTMLElement>(".apm-field__label")!.textContent = `Type “${name}” to confirm`;

    const confirmInput = modal.querySelector<HTMLInputElement>(".js-confirm")!;
    const deleteBtn = modal.querySelector<HTMLButtonElement>(".js-delete")!;

    function close(result: boolean) {
      shell.destroy();
      resolve(result);
    }

    const matched = () => nameMatches(confirmInput.value, name);
    confirmInput.addEventListener("input", () => {
      deleteBtn.disabled = !matched();
    });
    confirmInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && matched()) {
        e.preventDefault();
        close(true);
      }
    });

    modal.querySelector(".js-cancel")!.addEventListener("click", () => close(false));
    deleteBtn.addEventListener("click", () => {
      if (matched()) close(true);
    });

    setTimeout(() => confirmInput.focus({ preventScroll: true }), 0);
  });
}
