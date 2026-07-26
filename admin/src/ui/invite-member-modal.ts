// "Invite people" modal (members-page Phase 2) — the ONE place inviting starts: an email + a role
// (Manager / Member). Resolves { email, role } on Send, or null on any way out (Cancel, Escape,
// backdrop). Reuses the shared .modal-backdrop / .card.modal + apm styles and focus-trap pattern
// from add-person-modal.ts. Pure validation lives in ./invite-member-form.ts (unit-tested). The
// server re-validates and mints the one-time join link; a failed email never blocks the invite.

import "../styles/add-person-modal.css";
import { openModalShell } from "./modal-shell.ts";
import { cleanInvite, type InviteDraft } from "./invite-member-form.ts";
import { button } from "./button.ts";

export function showInviteMemberModal(): Promise<InviteDraft | null> {
  return new Promise((resolve) => {
    const shell = openModalShell({
      className: "card modal apm",
      labelledBy: "invite-member-title",
      onClose: () => close(null),
      html: `
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
            <option value="member" selected>Member. Sees only their own 1:1s</option>
            <option value="manager">Manager. Runs 1:1s, manages the team</option>
          </select>
        </div>
      </div>
      <div class="apm__foot">
        ${button({ label: "Cancel", variant: "ghost", hook: "js-cancel" })}
        ${button({ label: "Send invite", hook: "js-send" })}
      </div>`,
    });
    const modal = shell.el;

    const emailInput = modal.querySelector<HTMLInputElement>(".js-email")!;
    const roleSelect = modal.querySelector<HTMLSelectElement>(".js-role")!;
    const err = modal.querySelector<HTMLElement>(".js-err")!;

    function close(result: InviteDraft | null) {
      shell.destroy();
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

    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
    emailInput.addEventListener("input", () => {
      if (!err.hidden) { err.hidden = true; emailInput.removeAttribute("aria-invalid"); }
    });
    modal.querySelector(".js-send")!.addEventListener("click", submit);
    modal.querySelector(".js-cancel")!.addEventListener("click", () => close(null));

    setTimeout(() => emailInput.focus({ preventScroll: true }), 0);
  });
}
