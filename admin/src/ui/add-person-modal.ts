// "Add someone" modal — the manager adds a teammate to their roster with the details
// Sero preps from: name (required), job, and seniority. Replaces the old single-field
// window.prompt on the Team page so a person's role/seniority are captured up front and
// carry into their first 1:1. Reuses the shared .modal-backdrop / .card.modal base and
// focus-trap pattern from confirm.js; the compact boxed fields + header/footer come from
// add-person-modal.css (DESIGN §5). Resolves the draft on Add, or null on any way out
// (Cancel, Escape, backdrop). The server trims + caps everything again on insert.

import "../styles/add-person-modal.css";
import { openModalShell } from "./modal-shell.ts";
import { cleanPersonForm, inviteEmailError } from "./add-person-form.ts";
import type { PersonDraft } from "./add-person-form.ts";

export type { PersonDraft } from "./add-person-form.ts";

/** Options let the same modal do double duty as the "Edit" form: a different title,
 *  submit label, sub-line, and pre-filled values. Defaults are the "Add someone" case. */
export interface PersonModalOptions {
  title?: string;
  sub?: string;
  submitLabel?: string;
  initial?: Partial<PersonDraft>;
  /** Show the "invite by email" checkbox + email field. On for Add, off for Edit. */
  allowInvite?: boolean;
}

export function showAddPersonModal(opts: PersonModalOptions = {}): Promise<PersonDraft | null> {
  const title = opts.title ?? "Add someone to your team";
  const sub = opts.sub ?? "Just a name to start. Add their role if you know it.";
  const submitLabel = opts.submitLabel ?? "Add";
  const initial = opts.initial ?? {};
  const allowInvite = opts.allowInvite ?? true;
  return new Promise((resolve) => {
    const shell = openModalShell({
      className: "card modal apm",
      labelledBy: "add-person-title",
      onClose: () => close(null),
      html: `
      <div class="apm__head">
        <div class="apm__title" id="add-person-title"></div>
        <div class="apm__sub"></div>
      </div>
      <div class="apm__body">
        <div class="apm-field">
          <label class="apm-field__label" for="apm-name">Name</label>
          <input class="apm-field__input js-name" id="apm-name" type="text" autocomplete="off"
                 spellcheck="false" placeholder="e.g. Priya" aria-describedby="apm-err" />
          <div class="apm__err js-err" id="apm-err" role="alert" hidden></div>
        </div>
        <div class="apm-field">
          <label class="apm-field__label" for="apm-role">Job <span class="apm-field__opt">· optional</span></label>
          <input class="apm-field__input js-role" id="apm-role" type="text" autocomplete="off"
                 placeholder="e.g. Senior backend engineer" />
        </div>
        <div class="apm-field">
          <label class="apm-field__label" for="apm-seniority">Seniority <span class="apm-field__opt">· optional</span></label>
          <input class="apm-field__input js-seniority" id="apm-seniority" type="text" autocomplete="off"
                 placeholder="e.g. Senior / Staff / Lead" />
        </div>
      </div>
      <div class="apm__foot">
        <button type="button" class="btn btn--ghost js-cancel">Cancel</button>
        <button type="button" class="btn js-add"></button>
      </div>`,
    });
    const modal = shell.el;

    // Set text via textContent (never innerHTML) so a person's own name can seed the
    // title/values without any HTML-injection risk.
    modal.querySelector<HTMLElement>(".apm__title")!.textContent = title;
    modal.querySelector<HTMLElement>(".apm__sub")!.textContent = sub;
    modal.querySelector<HTMLElement>(".js-add")!.textContent = submitLabel;

    const nameInput = modal.querySelector<HTMLInputElement>(".js-name")!;
    const roleInput = modal.querySelector<HTMLInputElement>(".js-role")!;
    const seniorityInput = modal.querySelector<HTMLInputElement>(".js-seniority")!;
    const inviteCheck = modal.querySelector<HTMLInputElement>(".js-invite"); // absent when !allowInvite
    const emailWrap = modal.querySelector<HTMLElement>(".js-invite-email");
    const emailInput = modal.querySelector<HTMLInputElement>(".js-email");
    const err = modal.querySelector<HTMLElement>(".js-err")!;
    nameInput.value = initial.name ?? "";
    roleInput.value = initial.role ?? "";
    seniorityInput.value = initial.seniority ?? "";

    function close(result: PersonDraft | null) {
      shell.destroy();
      resolve(result);
    }

    function submit() {
      const draft = cleanPersonForm({
        name: nameInput.value,
        role: roleInput.value,
        seniority: seniorityInput.value,
        email: emailInput?.value,
        invite: inviteCheck?.checked === true,
      });
      if (!draft) {
        err.textContent = "Add a name to continue.";
        err.hidden = false;
        nameInput.setAttribute("aria-invalid", "true");
        nameInput.focus();
        return;
      }
      const emailErr = inviteEmailError({ invite: draft.invite, email: draft.email });
      if (emailErr) {
        err.textContent = emailErr;
        err.hidden = false;
        emailInput?.setAttribute("aria-invalid", "true");
        emailInput?.focus();
        return;
      }
      close(draft);
    }

    // Enter from any field submits.
    [nameInput, roleInput, seniorityInput, emailInput].forEach((input) =>
      input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      }),
    );
    // Typing a name clears the "needs a name" error so it doesn't linger.
    nameInput.addEventListener("input", () => {
      if (!err.hidden) {
        err.hidden = true;
        nameInput.removeAttribute("aria-invalid");
      }
    });
    // The email field only appears once "invite" is ticked, so adding one name stays fast.
    inviteCheck?.addEventListener("change", () => {
      if (emailWrap) emailWrap.hidden = !inviteCheck.checked;
      if (!err.hidden) {
        err.hidden = true;
        emailInput?.removeAttribute("aria-invalid");
      }
      if (inviteCheck.checked) setTimeout(() => emailInput?.focus({ preventScroll: true }), 0);
    });
    emailInput?.addEventListener("input", () => {
      if (!err.hidden) {
        err.hidden = true;
        emailInput.removeAttribute("aria-invalid");
      }
    });
    modal.querySelector(".js-cancel")!.addEventListener("click", () => close(null));
    modal.querySelector(".js-add")!.addEventListener("click", submit);

    setTimeout(() => nameInput.focus({ preventScroll: true }), 0);
  });
}
