// Forgot-password screen — enter your email and we send a reset link. Reached from the
// login form's "Forgot password?" link; shared by both apps (like login/register). The
// confirmation is the SAME whether or not the email has an account — the server answers
// 200 either way, so nothing here leaks which addresses are registered.

import { STAGES } from "../state.js";
import { requestPasswordReset } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { isTouchScreen } from "../ui/field.js";
import { LOGIN_PHOTOS } from "./login.js";

export async function mount(root, { setState }) {
  root.classList.add("stage--auth");
  // Fixed first photo — same deterministic pick as the other auth screens (audit A4).
  const photo = LOGIN_PHOTOS[0];
  root.innerHTML = `
    <div class="auth-split">
      <div class="auth-split__form">
        <div class="auth-panel l-stack l-stack--6">
          <div class="auth-brand">
            <img class="auth-brand__logo" src="${import.meta.env.BASE_URL}logo.png" alt="" aria-hidden="true" />
            <h1 class="auth-brand__title">Reset your password</h1>
            <p class="auth-brand__sub">Enter your email and we'll send you a link to set a new one.</p>
          </div>
          <div class="js-host">
            <form class="l-stack l-stack--4 js-form" novalidate>
              <label class="l-stack l-stack--2">
                <span class="eyebrow eyebrow--slot">Email</span>
                <input class="input js-email" type="email" autocomplete="username" required />
              </label>
              <p class="js-err text-negative text-sm" hidden></p>
              <button type="submit" class="btn js-submit">Send reset link</button>
            </form>
          </div>
          <p class="text-ink-dim text-sm">
            Remembered it?
            <button type="button" class="link js-to-login">Back to log in</button>
          </p>
        </div>
      </div>
      <div class="auth-split__media" aria-hidden="true">
        <img class="auth-split__img" src="${import.meta.env.BASE_URL}${photo}" alt="" onerror="this.remove()" />
      </div>
    </div>
  `;

  const host = root.querySelector(".js-host");
  const form = root.querySelector(".js-form");
  const emailEl = root.querySelector(".js-email");
  const submitBtn = root.querySelector(".js-submit");
  const err = root.querySelector(".js-err");

  root.querySelector(".js-to-login").addEventListener("click", () => setState({ stage: STAGES.LOGIN }));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.hidden = true;
    const email = emailEl.value.trim();
    if (!email) { err.textContent = "Enter your email."; err.hidden = false; return; }
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    try {
      await requestPasswordReset({ email });
      // Always the same confirmation — the server answers 200 whether or not the email
      // has an account, so nothing here reveals which addresses are registered. A quiet
      // Resend button re-submits the same email (audit A4) instead of "wait a minute" prose.
      host.innerHTML = `
        <div class="card-flat space-y-3">
          <p>If <strong>${escapeHtml(email)}</strong> has a Sero account, we've sent a reset link. Check your inbox. It works for 1 hour.</p>
          <p class="text-ink-dim text-sm">Didn't get it? Check your spam folder.</p>
          <button type="button" class="btn btn--ghost js-resend">Resend email</button>
          <p class="js-resend-err text-negative text-sm" hidden></p>
        </div>`;
      const resendBtn = host.querySelector(".js-resend");
      const resendErr = host.querySelector(".js-resend-err");
      resendBtn.addEventListener("click", async () => {
        resendErr.hidden = true;
        resendBtn.disabled = true;
        resendBtn.textContent = "Sending…";
        try {
          await requestPasswordReset({ email });
          resendBtn.textContent = "Sent again";
        } catch (e3) {
          resendErr.textContent = e3.message || "Something went wrong. Try again.";
          resendErr.hidden = false;
          resendBtn.textContent = "Resend email";
        }
        resendBtn.disabled = false;
      });
    } catch (e2) {
      err.textContent = e2.message || "Something went wrong. Try again.";
      err.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Send reset link";
    }
  });

  // Desktop only — on a phone this pops the keyboard over the page (phone walk 2026-07-11).
  if (!isTouchScreen()) requestAnimationFrame(() => emailEl.focus({ preventScroll: true }));
}

export function unmount(root) {
  root?.classList.remove("stage--auth");
}
