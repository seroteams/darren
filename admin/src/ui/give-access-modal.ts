// "Give access" modal — one sheet to let a roster person log in and see their own 1:1s
// (list-only: dates + meeting types, never the manager's notes). Replaces the old two-control
// split (a separate Invite button + an always-visible account dropdown) with one place that
// offers both paths: link an existing company account, OR invite someone by email. When the
// person is already linked it also offers "Remove access". Reuses the shared .modal-backdrop /
// .card.modal + apm styles and focus-trap from add-person-modal.ts. Resolves the chosen action,
// or null on any way out (Cancel, Escape, backdrop).

import "../styles/add-person-modal.css";
import { escapeHtml } from "./html.js";

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

function getFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function showGiveAccessModal(opts: GiveAccessOptions): Promise<GiveAccessResult | null> {
  const linked = !!opts.currentUserId;
  const title = linked ? `${opts.name}'s access` : `Give ${opts.name} access`;
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "card modal apm";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "give-access-title");

    const options = opts.users
      .map((u) => `<option value="${escapeHtml(u.id)}" ${u.id === opts.currentUserId ? "selected" : ""}>${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`)
      .join("");
    const linkSection = opts.users.length
      ? `<div class="apm-field">
           <label class="apm-field__label" for="ga-user">Link an existing account</label>
           <div class="l-cluster l-cluster--2" style="align-items:center;gap:8px;">
             <select class="apm-field__input js-user" id="ga-user" style="flex:1;min-width:0;">
               <option value="">— choose an account —</option>${options}
             </select>
             <button type="button" class="btn js-link">Link</button>
           </div>
         </div>
         <div class="text-sm text-ink-dim" style="text-align:center;margin:2px 0;">or</div>`
      : "";
    const removeRow = linked
      ? `<button type="button" class="btn btn--ghost js-remove" style="align-self:flex-start;">Remove access</button>`
      : "";

    modal.innerHTML = `
      <div class="apm__head">
        <div class="apm__title" id="give-access-title"></div>
        <div class="apm__sub">They'll see the list of their own 1:1s — dates and meeting types, never your notes.</div>
      </div>
      <div class="apm__body">
        ${linkSection}
        <div class="apm-field">
          <label class="apm-field__label" for="ga-email">Invite by email</label>
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
      </div>`;
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // textContent (never innerHTML) so a person's own name can seed the title with no injection risk.
    modal.querySelector<HTMLElement>(".apm__title")!.textContent = title;

    const userSelect = modal.querySelector<HTMLSelectElement>(".js-user"); // may be absent (no accounts)
    const emailInput = modal.querySelector<HTMLInputElement>(".js-email")!;
    const err = modal.querySelector<HTMLElement>(".js-err")!;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function close(result: GiveAccessResult | null) {
      document.removeEventListener("keydown", onKey, true);
      backdrop.remove();
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus({ preventScroll: true });
      }
      resolve(result);
    }

    function doLink() {
      const userId = userSelect?.value ?? "";
      if (!userId) {
        err.textContent = "Choose an account to link.";
        err.hidden = false;
        userSelect?.focus();
        return;
      }
      close({ kind: "link", userId });
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
      if (e.key === "Enter") { e.preventDefault(); doInvite(); }
    });
    emailInput.addEventListener("input", () => {
      if (!err.hidden) { err.hidden = true; emailInput.removeAttribute("aria-invalid"); }
    });
    modal.querySelector(".js-link")?.addEventListener("click", doLink);
    modal.querySelector(".js-invite")!.addEventListener("click", doInvite);
    modal.querySelector(".js-remove")?.addEventListener("click", () => close({ kind: "unlink" }));
    modal.querySelector(".js-cancel")!.addEventListener("click", () => close(null));
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(null); });
    document.addEventListener("keydown", onKey, true);

    setTimeout(() => (userSelect ?? emailInput).focus({ preventScroll: true }), 0);
  });
}
