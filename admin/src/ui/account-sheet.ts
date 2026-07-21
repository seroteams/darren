// Account sheet (audit M12) — a small settings slide-over opened from the profile badge.
// Shows who you're signed in as, lets you edit your display name, and change your password.
// Shared by both apps. Both writes go through the session (the server ignores any id in the
// body), so you can only ever change your OWN name/password.
//
// Scope note: company (your organisation's name) is NOT editable here — it's shared across
// everyone in the org and needs a who's-allowed rule, so it's a separate follow-up. Email
// stays read-only: it's the login identity.

import { changePassword, updateProfile } from "../../../shared/api.js";
import { store, setState } from "../state.js";
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
      <p class="text-sm text-ink-dim js-identity">${escapeHtml([name, email].filter(Boolean).join(" · "))}</p>
    </div>
    <form class="l-stack l-stack--3 js-name-form" novalidate>
      <div class="eyebrow">Your name</div>
      <label class="l-stack l-stack--1">
        <span class="text-sm text-ink-dim">Display name</span>
        <input class="input js-name" type="text" autocomplete="name" value="${escapeHtml(name)}" required />
      </label>
      <p class="js-name-err text-negative text-sm" hidden></p>
      <p class="js-name-ok text-sm" style="color:var(--color-positive-text);" hidden></p>
      <div class="modal__actions">
        <button type="submit" class="btn btn--ghost js-name-save">Save name</button>
      </div>
    </form>
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
        <button type="submit" class="btn js-save">Change password</button>
      </div>
    </form>
    <div class="modal__actions">
      <button type="button" class="btn btn--ghost js-close">Close</button>
    </div>
  `;
  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const identityEl = sheet.querySelector<HTMLElement>(".js-identity")!;
  const nameForm = sheet.querySelector<HTMLFormElement>(".js-name-form")!;
  const nameEl = sheet.querySelector<HTMLInputElement>(".js-name")!;
  const nameErr = sheet.querySelector<HTMLElement>(".js-name-err")!;
  const nameOk = sheet.querySelector<HTMLElement>(".js-name-ok")!;
  const nameSaveBtn = sheet.querySelector<HTMLButtonElement>(".js-name-save")!;

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

  async function onNameSubmit(e: Event): Promise<void> {
    e.preventDefault();
    nameErr.hidden = true; nameOk.hidden = true;
    const next = nameEl.value.trim();
    if (!next) { nameErr.textContent = "Your name can't be empty."; nameErr.hidden = false; return; }
    if (next === (store.user?.name || "").trim()) {
      nameOk.textContent = "That's already your name."; nameOk.hidden = false; return;
    }
    nameSaveBtn.disabled = true; nameSaveBtn.textContent = "Saving…";
    try {
      const res = await updateProfile({ name: next });
      const savedName = ((res?.user?.name as string) || next).trim();
      // Reflect it wherever the app already shows the name (the avatar initial, the next
      // time the sheet opens) — setState re-renders the nav + badge from the store.
      setState({ user: { ...store.user, name: savedName } });
      nameEl.value = savedName;
      identityEl.textContent = [savedName, email].filter(Boolean).join(" · ");
      nameOk.textContent = "Name updated."; nameOk.hidden = false;
    } catch (e2) {
      nameErr.textContent = e2 instanceof Error ? e2.message : "Couldn't update your name — please try again.";
      nameErr.hidden = false;
    } finally {
      nameSaveBtn.disabled = false; nameSaveBtn.textContent = "Save name";
    }
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
      ok.textContent = "Password changed. Use the new one next time you log in.";
      ok.hidden = false;
      form.reset();
    } catch (e2) {
      err.textContent = e2 instanceof Error ? e2.message : "Couldn't change your password — please try again.";
      err.hidden = false;
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = "Change password";
    }
  }

  nameForm.addEventListener("submit", onNameSubmit);
  form.addEventListener("submit", onSubmit);
  sheet.querySelector(".js-close")!.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.addEventListener("keydown", onKey, true);
  setTimeout(() => nameEl.focus({ preventScroll: true }), 0);
}
