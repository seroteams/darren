// "Invite people" modal (members-page Phase 2) — the ONE place inviting starts: an email + a role
// (Manager / Member). Resolves { email, role } on Send, or null on any way out (Cancel, Escape,
// backdrop). Reuses the shared .modal-backdrop / .card.modal + apm styles and focus-trap pattern
// from add-person-modal.ts. Pure validation lives in ./invite-member-form.ts (unit-tested). The
// server re-validates and mints the one-time join link; a failed email never blocks the invite.

import "../styles/add-person-modal.css";
import { cleanInvite, type InviteDraft } from "./invite-member-form.ts";

function getFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function showInviteMemberModal(): Promise<InviteDraft | null> {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "card modal apm";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "invite-member-title");
    modal.innerHTML = `
      <div class="apm__head">
        <div class="apm__title" id="invite-member-title">Invite people</div>
        <div class="apm__sub">They'll get a one-time link to set a password and log in.</div>
      </div>
      <div class="apm__body">
        <div class="apm-field">
          <label class="apm-field__label" for="im-email">Email</label>
          <input class="apm-field__input js-email" id="im-email" type="email" autocomplete="off"
                 spellcheck="false" placeholder="name@company.com" aria-describedby="im-err" />
          <div class="apm__err js-err" id="im-err" role="alert" hidden></div>
        </div>
        <div class="apm-field">
          <label class="apm-field__label" for="im-role">Role</label>
          <select class="apm-field__input js-role" id="im-role">
            <option value="member" selected>Member — sees only their own 1:1s</option>
            <option value="manager">Manager — runs 1:1s, manages the team</option>
          </select>
        </div>
      </div>
      <div class="apm__foot">
        <button type="button" class="btn btn--ghost js-cancel">Cancel</button>
        <button type="button" class="btn js-send">Send invite</button>
      </div>`;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const emailInput = modal.querySelector<HTMLInputElement>(".js-email")!;
    const roleSelect = modal.querySelector<HTMLSelectElement>(".js-role")!;
    const err = modal.querySelector<HTMLElement>(".js-err")!;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function close(result: InviteDraft | null) {
      document.removeEventListener("keydown", onKey, true);
      backdrop.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus({ preventScroll: true });
      }
      resolve(result);
    }

    function submit() {
      const { draft, error } = cleanInvite({ email: emailInput.value, role: roleSelect.value });
      if (!draft) {
        err.textContent = error ?? "Check the email address.";
        err.hidden = false;
        emailInput.setAttribute("aria-invalid", "true");
        emailInput.focus();
        return;
      }
      close(draft);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(null);
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = getFocusables(modal);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
    emailInput.addEventListener("input", () => {
      if (!err.hidden) { err.hidden = true; emailInput.removeAttribute("aria-invalid"); }
    });
    modal.querySelector(".js-send")!.addEventListener("click", submit);
    modal.querySelector(".js-cancel")!.addEventListener("click", () => close(null));
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(null); });
    document.addEventListener("keydown", onKey, true);

    setTimeout(() => emailInput.focus({ preventScroll: true }), 0);
  });
}
