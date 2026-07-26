// "Give access" modal — one sheet to let a roster person log in and see their own 1:1s
// (list-only: dates + meeting types, never the manager's notes). Replaces the old two-control
// split (a separate Invite button + an always-visible account dropdown) with one place that
// offers both paths: link an existing company account, OR invite someone by email. When the
// person is already linked it also offers "Remove access". Reuses the shared .modal-backdrop /
// .card.modal + apm styles and focus-trap from add-person-modal.ts. Resolves the chosen action,
// or null on any way out (Cancel, Escape, backdrop).

import "../styles/add-person-modal.css";
import { openModalShell } from "./modal-shell.ts";

export type OrgUser = { id: string; name: string; email: string };

export type GiveAccessResult =
  | { kind: "link"; userId: string }
  | { kind: "invite"; email: string }
  | { kind: "unlink" };

export interface GiveAccessOptions {
  name: string;
  users: OrgUser[];
  currentUserId?: string | null; // set when changing an existing link
}

export function showGiveAccessModal(opts: GiveAccessOptions): Promise<GiveAccessResult | null> {
  const linked = !!opts.currentUserId;
  const title = linked ? `${opts.name}'s access` : `Invite ${opts.name} to Sero`;
  return new Promise((resolve) => {
    // The old "Link an existing account" dropdown is retired (members-page Phase 5) — it leaked
    // account plumbing into the UI. Inviting by email is the one clean path; if that email already
    // has an account, the server links them automatically. This modal is now the per-person
    // "Invite to log in" shortcut.
    const removeRow = linked
      ? `<button type="button" class="btn btn--ghost js-remove" style="align-self:flex-start;">Remove access</button>`
      : "";

    const shell = openModalShell({
      className: "card modal apm",
      labelledBy: "give-access-title",
      onClose: () => close(null),
      html: `
      <div class="apm__head">
        <div class="apm__title" id="give-access-title"></div>
        <div class="apm__sub">They'll get a login to follow their own 1:1s with you. The dates and topics you met on. They never see your private notes, your ratings, or anyone else on your team.</div>
      </div>
      <div class="apm__body">
        <div class="apm-field">
          <label class="apm-field__label" for="ga-email">Their email</label>
          <div class="l-cluster l-cluster--2" style="align-items:center;gap:8px;">
            <input class="apm-field__input js-email" id="ga-email" type="email" autocomplete="off"
                   spellcheck="false" placeholder="name@company.com" style="flex:1;min-width:0;" aria-describedby="ga-err" />
            <button type="button" class="btn btn--ghost js-invite">Invite</button>
          </div>
          <div class="apm-field__opt">We'll create a one-time join link for you to send.</div>
          <div class="apm__err js-err" id="ga-err" role="alert" hidden></div>
        </div>
        ${removeRow}
      </div>
      <div class="apm__foot">
        <button type="button" class="btn btn--ghost js-cancel">Cancel</button>
      </div>`,
    });
    const modal = shell.el;

    // textContent (never innerHTML) so a person's own name can seed the title with no injection risk.
    modal.querySelector<HTMLElement>(".apm__title")!.textContent = title;

    const emailInput = modal.querySelector<HTMLInputElement>(".js-email")!;
    const err = modal.querySelector<HTMLElement>(".js-err")!;

    function close(result: GiveAccessResult | null) {
      shell.destroy();
      resolve(result);
    }

    function doInvite() {
      const email = emailInput.value.trim();
      if (!email || !email.includes("@")) {
        err.textContent = "Enter an email address to invite.";
        err.hidden = false;
        emailInput.setAttribute("aria-invalid", "true");
        emailInput.focus();
        return;
      }
      close({ kind: "invite", email });
    }

    emailInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); doInvite(); }
    });
    emailInput.addEventListener("input", () => {
      if (!err.hidden) { err.hidden = true; emailInput.removeAttribute("aria-invalid"); }
    });
    modal.querySelector(".js-invite")!.addEventListener("click", doInvite);
    modal.querySelector(".js-remove")?.addEventListener("click", () => close({ kind: "unlink" }));
    modal.querySelector(".js-cancel")!.addEventListener("click", () => close(null));

    setTimeout(() => emailInput.focus({ preventScroll: true }), 0);
  });
}
