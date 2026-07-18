// Account sheet (audit M12) — a small settings slide-over opened from the nav footer.
// Shows who you're signed in as, and lets you change your own password. Shared by both
// apps. The change-password call goes through the session (the server ignores any id in
// the body), so it can only ever change the signed-in user's own password.
//
// Scope note: display-name / company editing is NOT here yet — there's no self-update
// endpoint, and the security-critical, testable piece is the password change. Name +
// email are shown read-only; editable fields are a thin follow-up (flagged in phase-5.md).

import { changePassword } from "../../../shared/api.js";
import { escapeHtml } from "./html.js";

type User = { name?: string; email?: string } | null | undefined;

export function showAccountSheet(user: User): void {
  const name = (user?.name || "").trim();
  const email = (user?.email || "").trim();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const sheet = document.createElement("div");
  sheet.className = "card modal l-stack l-stack--4";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "account-title");

  sheet.innerHTML = `
    <div class="l-stack l-stack--1">
      <h2 class="h3" id="account-title">Your account</h2>
      ${name || email ? `<p class="text-sm text-ink-dim">${escapeHtml([name, email].filter(Boolean).join(" · "))}</p>` : ""}
    </div>
    <form class="l-stack l-stack--3 js-pw-form" novalidate>
      <div class="eyebrow">Change password</div>
      <label class="l-stack l-stack--1">
        <span class="text-sm text-ink-dim">Current password</span>
        <input class="input js-current" type="password" autocomplete="current-password" required />
      </label>
      <label class="l-stack l-stack--1">
        <span class="text-sm text-ink-dim">New password <span class="text-ink-mute">(at least 8 characters)</span></span>
        <input class="input js-new" type="password" autocomplete="new-password" required />
      </label>
      <p class="js-err text-negative text-sm" hidden></p>
      <p class="js-ok text-sm" style="color:var(--color-positive-text);" hidden></p>
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost js-close">Close</button>
        <button type="submit" class="btn js-save">Change password</button>
      </div>
    </form>
  `;
  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const form = sheet.querySelector<HTMLFormElement>(".js-pw-form")!;
  const currentEl = sheet.querySelector<HTMLInputElement>(".js-current")!;
  const newEl = sheet.querySelector<HTMLInputElement>(".js-new")!;
  const err = sheet.querySelector<HTMLElement>(".js-err")!;
  const ok = sheet.querySelector<HTMLElement>(".js-ok")!;
  const saveBtn = sheet.querySelector<HTMLButtonElement>(".js-save")!;

  function close(): void {
    document.removeEventListener("keydown", onKey, true);
    backdrop.remove();
    previouslyFocused?.focus?.({ preventScroll: true });
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") { e.preventDefault(); close(); }
  }

  async function onSubmit(e: Event): Promise<void> {
    e.preventDefault();
    err.hidden = true; ok.hidden = true;
    const currentPassword = currentEl.value;
    const newPassword = newEl.value;
    if (!currentPassword || !newPassword) { err.textContent = "Fill in both fields."; err.hidden = false; return; }
    saveBtn.disabled = true; saveBtn.textContent = "Changing…";
    try {
      await changePassword({ currentPassword, newPassword });
      ok.textContent = "Password changed. Use the new one next time you sign in.";
      ok.hidden = false;
      form.reset();
    } catch (e2) {
      err.textContent = e2 instanceof Error ? e2.message : "Couldn't change your password — please try again.";
      err.hidden = false;
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = "Change password";
    }
  }

  form.addEventListener("submit", onSubmit);
  sheet.querySelector(".js-close")!.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.addEventListener("keydown", onKey, true);
  setTimeout(() => currentEl.focus({ preventScroll: true }), 0);
}
