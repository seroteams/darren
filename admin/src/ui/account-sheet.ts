// Account page (audit M12; calm-scroll redesign 2026-07-22) — the account screen opened
// from the profile badge. Was a cramped centered modal; now a calm full-page overlay that
// reads as a single settled page (design B, Carl's pick). Shows who you're signed in as,
// lets you edit your display name and (managers only) your company name, and change your
// password. Shared by both apps. Every write goes through the session (the server ignores
// any id in the body), so you can only ever change your OWN name/password, or your OWN
// organisation.
//
// Company is your ORGANISATION's name — shared by everyone on the team, so it's manager/admin
// only (a member never sees the section, and the server 403s them). It's fetched on open
// (it's not part of the login identity) and saved through a separate endpoint. Email stays
// read-only: it's the login identity.
//
// The full-page layout gets its own scoped classes injected once (like profile-badge.js) so
// it doesn't touch the shared .modal-backdrop / .modal base in notes-panel.css (another lane).

import { changePassword, updateProfile, getCompany, updateCompany } from "../../../shared/api.js";
import { store, setState, isAdmin } from "../state.js";
import { escapeHtml } from "./html.js";

type User = { name?: string; email?: string } | null | undefined;

// One-time scoped styles for the account page overlay + its calm column. All new classes —
// nothing here overrides the shared modal chrome. Tokens only (DESIGN §2 tokens-only rule).
let stylesInjected = false;
function injectStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const s = document.createElement("style");
  s.textContent = `
    .acct-overlay {
      position: fixed; inset: 0; z-index: var(--sero-z-modal, 50);
      background: var(--color-page); overflow-y: auto; overflow-x: hidden;
    }
    .acct-page {
      max-width: 560px; margin: 0 auto; padding: 24px 20px 72px;
      display: flex; flex-direction: column; gap: 20px;
    }
    .acct-back {
      align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
      border: 0; background: transparent; color: var(--color-ink-dim); cursor: pointer;
      font: inherit; font-size: var(--type-body-sm, 14px); padding: 6px 2px;
    }
    .acct-back:hover, .acct-back:focus-visible { color: var(--color-ink); outline: none; }
    .acct-head { display: flex; flex-direction: column; gap: 4px; }
    .acct-quiet-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .acct-dots { letter-spacing: 3px; color: var(--color-ink-dim); font-size: var(--type-body-sm, 14px); }
    .acct-card-gap { display: flex; flex-direction: column; gap: 10px; }
    .acct-page .card { padding: 18px; }
    /* The compact boxed field (DESIGN §5 form variant), NOT the big borderless session
       .input — this is a settings form, not the prep flow. Same recipe as .apm-field__input. */
    .acct-input {
      width: 100%; padding: 10px 14px;
      font-size: var(--type-body-sm, 14px); font-family: inherit; color: var(--color-ink);
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-input, 4px);
    }
    .acct-input::placeholder { color: var(--color-ink-mute); }
    .acct-input:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus); }
    .acct-input:disabled { color: var(--color-ink-mute); }
    .acct-hint { font-size: var(--type-body-sm, 14px); color: var(--color-ink-dim); }
    .acct-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .acct-page .btn { padding: 8px 14px; font-size: var(--type-body-sm, 14px); }
    .acct-label { font-size: var(--type-body-sm, 14px); color: var(--color-ink-dim); }
    /* .l-stack / .acct-quiet-row set display:flex, which outweighs the bare [hidden]
       attribute — restore the hide so the password form + its summary toggle cleanly
       (same trap noted in profile-badge.js). */
    .acct-page [hidden] { display: none !important; }
  `;
  document.head.appendChild(s);
}

export function showAccountSheet(user: User): void {
  injectStyles();
  const name = (user?.name || "").trim();
  const email = (user?.email || "").trim();
  const canEditCompany = isAdmin(store.user);

  const overlay = document.createElement("div");
  overlay.className = "acct-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "account-title");

  const page = document.createElement("div");
  page.className = "acct-page";

  const companySection = canEditCompany
    ? `
    <form class="card acct-card-gap js-company-form" novalidate>
      <label class="eyebrow" for="acct-company">Company</label>
      <p class="acct-hint">Everyone on your team sees this.</p>
      <input id="acct-company" class="acct-input js-company" type="text" autocomplete="organization" placeholder="Loading…" disabled required />
      <p class="js-company-err text-negative text-sm" hidden></p>
      <p class="js-company-ok text-sm" style="color:var(--color-positive-text);" hidden></p>
      <div class="acct-actions">
        <button type="submit" class="btn btn--ghost js-company-save" disabled>Save company</button>
      </div>
    </form>`
    : "";

  page.innerHTML = `
    <button type="button" class="acct-back js-close" aria-label="Back">&larr; Back</button>
    <div class="acct-head">
      <h1 class="h2" id="account-title">Your account</h1>
      <p class="text-sm text-ink-dim js-identity">${escapeHtml([name, email].filter(Boolean).join(" · "))}</p>
    </div>

    <form class="card acct-card-gap js-name-form" novalidate>
      <label class="eyebrow" for="acct-name">Your name</label>
      <input id="acct-name" class="acct-input js-name" type="text" autocomplete="name" value="${escapeHtml(name)}" required />
      <p class="js-name-err text-negative text-sm" hidden></p>
      <p class="js-name-ok text-sm" style="color:var(--color-positive-text);" hidden></p>
      <div class="acct-actions">
        <button type="submit" class="btn btn--ghost js-name-save">Save name</button>
      </div>
    </form>

    ${companySection}

    <div class="acct-quiet-row js-pw-summary">
      <span class="acct-label">Password <span class="acct-dots">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span></span>
      <button type="button" class="btn btn--ghost js-pw-reveal">Change</button>
    </div>
    <form class="card acct-card-gap js-pw-form" novalidate hidden>
      <div class="eyebrow">Change password</div>
      <label class="acct-label" for="acct-current">Current password</label>
      <input id="acct-current" class="acct-input js-current" type="password" autocomplete="current-password" required />
      <label class="acct-label" for="acct-new">New password (at least 8 characters)</label>
      <input id="acct-new" class="acct-input js-new" type="password" autocomplete="new-password" required />
      <p class="js-err text-negative text-sm" hidden></p>
      <p class="js-ok text-sm" style="color:var(--color-positive-text);" hidden></p>
      <div class="acct-actions">
        <button type="button" class="btn btn--ghost js-pw-cancel">Cancel</button>
        <button type="submit" class="btn js-save">Change password</button>
      </div>
    </form>
  `;

  overlay.appendChild(page);
  document.body.appendChild(overlay);
  const previouslyFocused = document.activeElement as HTMLElement | null;

  const identityEl = page.querySelector<HTMLElement>(".js-identity")!;
  const nameForm = page.querySelector<HTMLFormElement>(".js-name-form")!;
  const nameEl = page.querySelector<HTMLInputElement>(".js-name")!;
  const nameErr = page.querySelector<HTMLElement>(".js-name-err")!;
  const nameOk = page.querySelector<HTMLElement>(".js-name-ok")!;
  const nameSaveBtn = page.querySelector<HTMLButtonElement>(".js-name-save")!;

  const pwSummary = page.querySelector<HTMLElement>(".js-pw-summary")!;
  const pwReveal = page.querySelector<HTMLButtonElement>(".js-pw-reveal")!;
  const pwCancel = page.querySelector<HTMLButtonElement>(".js-pw-cancel")!;
  const form = page.querySelector<HTMLFormElement>(".js-pw-form")!;
  const currentEl = page.querySelector<HTMLInputElement>(".js-current")!;
  const newEl = page.querySelector<HTMLInputElement>(".js-new")!;
  const err = page.querySelector<HTMLElement>(".js-err")!;
  const ok = page.querySelector<HTMLElement>(".js-ok")!;
  const saveBtn = page.querySelector<HTMLButtonElement>(".js-save")!;

  function close(): void {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    previouslyFocused?.focus?.({ preventScroll: true });
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") { e.preventDefault(); close(); }
  }

  // Password: quiet by default, reveals the fields on Change so the page doesn't open with a
  // third form staring at you (design B — calm scroll). Cancel folds it back.
  function setPwOpen(open: boolean): void {
    pwSummary.hidden = open;
    form.hidden = !open;
    if (open) { err.hidden = true; ok.hidden = true; setTimeout(() => currentEl.focus({ preventScroll: true }), 0); }
    else { form.reset(); }
  }
  pwReveal.addEventListener("click", () => setPwOpen(true));
  pwCancel.addEventListener("click", () => setPwOpen(false));

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
      // time the page opens) — setState re-renders the nav + badge from the store.
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
  page.querySelector(".js-close")!.addEventListener("click", close);
  document.addEventListener("keydown", onKey, true);
  setTimeout(() => nameEl.focus({ preventScroll: true }), 0);

  // Company (managers only): the org name isn't in the login identity, so fetch it on open
  // to prefill; the field stays disabled until it loads so a stray submit can't blank it.
  if (canEditCompany) {
    const companyForm = page.querySelector<HTMLFormElement>(".js-company-form")!;
    const companyEl = page.querySelector<HTMLInputElement>(".js-company")!;
    const companyErr = page.querySelector<HTMLElement>(".js-company-err")!;
    const companyOk = page.querySelector<HTMLElement>(".js-company-ok")!;
    const companySaveBtn = page.querySelector<HTMLButtonElement>(".js-company-save")!;

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
