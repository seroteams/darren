// Login screen — email + password against POST /api/v1/auth/login. On success the
// server sets the session cookie; we store the user in state and land on START.
// A link switches to the register screen.

import { STAGES, isAdmin } from "../state.js";
import { login } from "../../../shared/api.js";

export async function mount(root, { setState }) {
  // Login is a full-bleed split screen: form on the left, photo on the right.
  // Break the stage out of its centered/padded default for this screen only.
  root.classList.add("stage--auth");
  root.innerHTML = `
    <div class="auth-split">
      <div class="auth-split__form">
        <div class="auth-panel l-stack l-stack--6">
          <div class="auth-brand">
            <img class="auth-brand__logo" src="/logo.png" alt="" aria-hidden="true" />
            <h1 class="auth-brand__title">Sero — where teams thrive</h1>
            <p class="auth-brand__sub">Your 1:1s are broken. Let's fix that.</p>
          </div>
          <form class="l-stack l-stack--4 js-form" novalidate>
            <label class="l-stack l-stack--2">
              <span class="eyebrow">Email</span>
              <input class="input js-email" type="email" autocomplete="username" required />
            </label>
            <label class="l-stack l-stack--2">
              <span class="eyebrow">Password</span>
              <input class="input js-password" type="password" autocomplete="current-password" required />
            </label>
            <p class="js-err text-negative text-sm" hidden></p>
            <button type="submit" class="btn js-submit">Sign in</button>
          </form>
          <p class="text-ink-dim text-sm">
            No account yet?
            <button type="button" class="link js-to-register">Create one</button>
          </p>
        </div>
      </div>
      <div class="auth-split__media" aria-hidden="true">
        <img class="auth-split__img" src="/login.jpg" alt="" onerror="this.remove()" />
      </div>
    </div>
  `;

  const form = root.querySelector(".js-form");
  const emailEl = root.querySelector(".js-email");
  const passwordEl = root.querySelector(".js-password");
  const submitBtn = root.querySelector(".js-submit");
  const err = root.querySelector(".js-err");

  function showError(message) {
    err.textContent = message;
    err.hidden = false;
  }

  async function onSubmit(e) {
    e.preventDefault();
    err.hidden = true;
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    if (!email || !password) { showError("Enter your email and password."); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in…";
    try {
      const { user } = await login({ email, password });
      // A plain member lands on their own clean Home (member-nav Phase 1); only an
      // admin/owner gets the internal start page. Mirrors the boot routing in main.js
      // so login and a fresh reload land in the same place.
      setState({ user, stage: isAdmin(user) ? STAGES.START : STAGES.MEMBER_HOME });
    } catch (e2) {
      showError(e2.message || "Could not log in.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  }

  form.addEventListener("submit", onSubmit);
  root.querySelector(".js-to-register").addEventListener("click", () => setState({ stage: STAGES.REGISTER }));

  // Dev convenience — prefill a local dev account so you're never locked out while
  // testing, with a one-click swap between the ADMIN (owner) and a STANDARD (member)
  // account for exercising the role wall. Every visit defaults to Admin. Credentials
  // come from your local .env only (VITE_DEV_LOGIN_EMAIL / _PASSWORD for admin,
  // VITE_DEV_LOGIN_MEMBER_EMAIL / _PASSWORD for standard — see .env.example); no
  // credentials live in source. Without them the prefill simply doesn't appear. The
  // whole block is stripped from production builds (import.meta.env.DEV is false there).
  const devAdminEmail = import.meta.env.DEV ? import.meta.env.VITE_DEV_LOGIN_EMAIL : undefined;
  if (devAdminEmail) {
    const ADMIN = {
      label: "Admin",
      email: devAdminEmail,
      password: import.meta.env.VITE_DEV_LOGIN_PASSWORD || "",
    };
    const memberEmail = import.meta.env.VITE_DEV_LOGIN_MEMBER_EMAIL;
    const STANDARD = memberEmail
      ? {
          label: "Standard user",
          email: memberEmail,
          password: import.meta.env.VITE_DEV_LOGIN_MEMBER_PASSWORD || "",
        }
      : null;

    // A small dev-only line under the form — reuses the same `.link` style as "Create one".
    const swap = document.createElement("p");
    swap.className = "text-ink-dim text-sm js-dev-swap";
    root.querySelector(".js-to-register").closest("p").before(swap);

    function fill(role) {
      emailEl.value = role.email;
      passwordEl.value = role.password;
      const other = role === ADMIN ? STANDARD : ADMIN;
      if (other) {
        swap.innerHTML = `Dev login: <strong>${role.label}</strong> — <button type="button" class="link js-swap">use ${other.label.toLowerCase()}</button>`;
        swap.querySelector(".js-swap").addEventListener("click", () => fill(other));
      } else {
        swap.innerHTML = `Dev login: <strong>${role.label}</strong>`;
      }
    }

    fill(ADMIN); // default to admin every visit
    requestAnimationFrame(() => submitBtn.focus({ preventScroll: true }));
  } else {
    requestAnimationFrame(() => emailEl.focus({ preventScroll: true }));
  }
}

export function unmount(root) {
  root?.classList.remove("stage--auth");
}
