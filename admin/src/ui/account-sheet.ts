// Account sheet (audit M12) — a small settings slide-over opened from the profile badge.
// Shows who you're signed in as, lets you edit your display name and (managers only) your
// company name, and change your password. Shared by both apps. Every write goes through the
// session (the server ignores any id in the body), so you can only ever change your OWN
// name/password, or your OWN organisation.
//
// Company is your ORGANISATION's name — shared by everyone on the team, so it's manager/admin
// only (a member never sees the field, and the server 403s them). It's fetched on open (it's
// not part of the login identity) and saved through a separate endpoint. Email stays
// read-only: it's the login identity.

import { changePassword, updateProfile, getCompany, updateCompany } from "../../../shared/api.js";
import { store, setState, isAdmin } from "../state.js";
import { escapeHtml } from "./html.js";

type User = { name?: string; email?: string } | null | undefined;

export function showAccountSheet(user: User): void {
  const name = (user?.name || "").trim();
  const email = (user?.email || "").trim();
  const canEditCompany = isAdmin(store.user);

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const sheet = document.createElement("div");
  sheet.className = "card modal l-stack l-stack--4";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-labelledby", "account-title");

  const companySection = canEditCompany
    ? `
    <form class="l-stack l-stack--3 js-company-form" novalidate>
      <div class="eyebrow">Company</div>
      <label class="l-stack l-stack--1">
        <span class="text-sm text-ink-dim">Company name <span class="text-ink-mute">(everyone on your team sees this)</span></span>
        <input class="input js-company" type="text" autocomplete="organization" placeholder="Loading…" disabled required />
      </label>
      <p class="js-company-err text-negative text-sm" hidden></p>
      <p class="js-company-ok text-sm" style="color:var(--color-positive-text);" hidden></p>
      <div class="modal__actions">
        <button type="submit" class="btn btn--ghost js-company-save" disabled>Save company</button>
      </div>
    </form>`
    : "";

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
    ${companySection}
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
      nameErr.textContent = e2 instanceof Error ? e2.message : "Couldn't update your name. Please try again.";
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
      err.textContent = e2 instanceof Error ? e2.message : "Couldn't change your password. Please try again.";
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

  // Company (managers only): the org name isn't in the login identity, so fetch it on open
  // to prefill; the field stays disabled until it loads so a stray submit can't blank it.
  if (canEditCompany) {
    const companyForm = sheet.querySelector<HTMLFormElement>(".js-company-form")!;
    const companyEl = sheet.querySelector<HTMLInputElement>(".js-company")!;
    const companyErr = sheet.querySelector<HTMLElement>(".js-company-err")!;
    const companyOk = sheet.querySelector<HTMLElement>(".js-company-ok")!;
    const companySaveBtn = sheet.querySelector<HTMLButtonElement>(".js-company-save")!;

    let loaded = "";
    getCompany()
      .then((res) => {
        loaded = ((res?.company as string) || "").trim();
        companyEl.value = loaded;
        companyEl.placeholder = "Your company name";
        companyEl.disabled = false;
        companySaveBtn.disabled = false;
      })
      .catch(() => {
        companyEl.placeholder = "Couldn't load. Reopen to try again";
      });

    companyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      companyErr.hidden = true; companyOk.hidden = true;
      const next = companyEl.value.trim();
      if (!next) { companyErr.textContent = "Your company name can't be empty."; companyErr.hidden = false; return; }
      if (next === loaded) { companyOk.textContent = "That's already your company name."; companyOk.hidden = false; return; }
      companySaveBtn.disabled = true; companySaveBtn.textContent = "Saving…";
      try {
        const res = await updateCompany({ company: next });
        loaded = ((res?.company as string) || next).trim();
        companyEl.value = loaded;
        setState({ user: { ...store.user, company: loaded } });
        companyOk.textContent = "Company updated for your whole team."; companyOk.hidden = false;
      } catch (e2) {
        companyErr.textContent = e2 instanceof Error ? e2.message : "Couldn't update your company. Please try again.";
        companyErr.hidden = false;
      } finally {
        companySaveBtn.disabled = false; companySaveBtn.textContent = "Save company";
      }
    });
  }
}
