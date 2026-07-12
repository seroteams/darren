// "Delete this person?" modal — the destructive confirm for a hard delete. Deleting a
// person permanently wipes them AND every 1:1 about them (see people.service.remove), so
// this gates the action behind a type-the-exact-name step, GitHub-style: the Delete button
// stays disabled until the manager retypes the name. Rides the shared .modal-backdrop /
// .card.modal base + add-person-modal.css (the .apm--danger variant); resolves true only
// on a confirmed delete, false on any way out (Cancel, Escape, backdrop).

import "../styles/add-person-modal.css";
import { nameMatches } from "./add-person-form.ts";

function getFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function showDeletePersonModal(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "card modal apm apm--danger";
    modal.setAttribute("role", "alertdialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "del-person-title");
    modal.innerHTML = `
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
      </div>`;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // textContent (never innerHTML) so the person's own name can't inject markup.
    modal.querySelector<HTMLElement>(".apm__title")!.textContent = `Delete ${name}?`;
    modal.querySelector<HTMLElement>(".apm__warn")!.textContent =
      `This permanently deletes ${name} and every 1:1 about them. This can't be undone.`;
    modal.querySelector<HTMLElement>(".apm-field__label")!.textContent = `Type “${name}” to confirm`;

    const confirmInput = modal.querySelector<HTMLInputElement>(".js-confirm")!;
    const deleteBtn = modal.querySelector<HTMLButtonElement>(".js-delete")!;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function close(result: boolean) {
      document.removeEventListener("keydown", onKey, true);
      backdrop.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus({ preventScroll: true });
      }
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

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(false);
        return;
      }
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

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close(false);
    });
    modal.querySelector(".js-cancel")!.addEventListener("click", () => close(false));
    deleteBtn.addEventListener("click", () => {
      if (matched()) close(true);
    });
    document.addEventListener("keydown", onKey, true);

    setTimeout(() => confirmInput.focus({ preventScroll: true }), 0);
  });
}
