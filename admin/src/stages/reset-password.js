// Reset-password screen — where an emailed /reset-password/:token link lands. Reads the
// token from state, takes a new password, and on success sends you to log in with it. No
// auto-login (Carl's call) — logging in proves the new password works. A dead/used/expired
// link gets a plain-words message and a path to login. Shared by both apps (like login).

import { STAGES, store } from "../state.js";
import { submitPasswordReset } from "../../../shared/api.js";
import { isTouchScreen } from "../ui/field.js";
import { LOGIN_PHOTOS } from "./login.js";

const MIN_PASSWORD = 8; // same floor the server enforces

export async function mount(root, { setState }) {
  root.classList.add("stage--auth");
  const photo = LOGIN_PHOTOS[Math.floor(Math.random() * LOGIN_PHOTOS.length)];
  const token = store.resetToken;
  root.innerHTML = `
    <div class="auth-split">
      <div class="auth-split__form">
        <div class="auth-panel l-stack l-stack--6">
          <div class="auth-brand">
            <img class="auth-brand__logo" src="${import.meta.env.BASE_URL}logo.png" alt="" aria-hidden="true" />
            <h1 class="auth-brand__title">Choose a new password</h1>
            <p class="auth-brand__sub">Set a new password for your Sero account.</p>
          </div>
          <div class="js-host"></div>
        </div>
      </div>
      <div class="auth-split__media" aria-hidden="true">
        <img class="auth-split__img" src="${import.meta.env.BASE_URL}${photo}" alt="" onerror="this.remove()" />
      </div>
    </div>
  `;
  const host = root.querySelector(".js-host");
  const toLogin = () => setState({ resetToken: null, stage: STAGES.LOGIN });

  // No token in the link — can't reset. Plain message + a way back.
  if (!token) {
    host.innerHTML = `
      <div class="card-flat space-y-3">
        <p>This reset link isn't valid — it's missing its code. Request a fresh one from the login screen.</p>
        <button type="button" class="btn btn--ghost js-to-login">Go to log in</button>
      </div>`;
    host.querySelector(".js-to-login").addEventListener("click", toLogin);
    return;
  }

  host.innerHTML = `
    <form class="l-stack l-stack--4 js-form" novalidate>
      <label class="l-stack l-stack--2">
        <span class="eyebrow">New password <span class="text-ink-mute">(at least ${MIN_PASSWORD} characters)</span></span>
        <input class="input js-password" type="password" autocomplete="new-password" required />
      </label>
      <p class="js-err text-negative text-sm" hidden></p>
      <button type="submit" class="btn js-submit">Set new password</button>
    </form>`;

  const form = host.querySelector(".js-form");
  const passwordEl = host.querySelector(".js-password");
  const submitBtn = host.querySelector(".js-submit");
  const err = host.querySelector(".js-err");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    const password = passwordEl.value;
    if (password.length < MIN_PASSWORD) {
      err.textContent = `Password must be at least ${MIN_PASSWORD} characters.`;
      err.hidden = false;
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
    try {
      await submitPasswordReset({ token, password });
      // No auto-login — show success and send them to log in with the new password.
      host.innerHTML = `
        <div class="card-flat space-y-3">
          <p><strong>Password updated.</strong> Log in with your new password to continue.</p>
          <button type="button" class="btn js-to-login">Go to log in</button>
        </div>`;
      host.querySelector(".js-to-login").addEventListener("click", toLogin);
    } catch (e2) {
      err.textContent = e2.message || "Couldn't reset your password — the link may have expired.";
      err.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Set new password";
    }
  });

  // Desktop only — on a phone this pops the keyboard over the page (phone walk 2026-07-11).
  if (!isTouchScreen()) requestAnimationFrame(() => passwordEl.focus({ preventScroll: true }));
}

export function unmount(root) {
  root?.classList.remove("stage--auth");
}
