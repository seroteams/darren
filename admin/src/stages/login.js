// Login screen — email + password against POST /api/v1/auth/login. On success the
// server sets the session cookie; we store the user in state and land on START.
// A link switches to the register screen.

import { STAGES, isAdmin } from "../state.js";
import { login } from "../../../shared/api.js";

export async function mount(root, { setState }) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8 auth-card">
      <header class="page-header">
        <h1 class="h1">Log in</h1>
        <div class="text-ink-dim text-sm">Welcome back. Sign in to your workspace.</div>
      </header>
      <form class="card-flat space-y-3 js-form" novalidate>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Email</span>
          <input class="input js-email" type="email" autocomplete="username" required />
        </label>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Password</span>
          <input class="input js-password" type="password" autocomplete="current-password" required />
        </label>
        <p class="js-err text-negative text-sm" hidden></p>
        <button type="submit" class="btn js-submit">Log in</button>
      </form>
      <p class="text-ink-dim text-sm">
        No account yet?
        <button type="button" class="link js-to-register">Create one</button>
      </p>
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
      submitBtn.textContent = "Log in";
    }
  }

  form.addEventListener("submit", onSubmit);
  root.querySelector(".js-to-register").addEventListener("click", () => setState({ stage: STAGES.REGISTER }));

  // Dev convenience — prefill a local dev account so you're never locked out while
  // testing, with a one-click swap between the ADMIN (owner) and a STANDARD (member)
  // account for exercising the role wall. Every visit defaults to Admin. All of this is
  // stripped from production builds (import.meta.env.DEV is false there), so the creds
  // and the toggle never ship. Override via VITE_DEV_LOGIN_EMAIL / _PASSWORD (admin) and
  // VITE_DEV_LOGIN_MEMBER_EMAIL / _PASSWORD (standard).
  if (import.meta.env.DEV) {
    const ADMIN = {
      label: "Admin",
      email: import.meta.env.VITE_DEV_LOGIN_EMAIL || "carl@seroteams.com",
      password: import.meta.env.VITE_DEV_LOGIN_PASSWORD || "serodev123",
    };
    const STANDARD = {
      label: "Standard user",
      email: import.meta.env.VITE_DEV_LOGIN_MEMBER_EMAIL || "member@seroteams.com",
      password: import.meta.env.VITE_DEV_LOGIN_MEMBER_PASSWORD || "seromember123",
    };

    // A small dev-only line under the form — reuses the same `.link` style as "Create one".
    const swap = document.createElement("p");
    swap.className = "text-ink-dim text-sm js-dev-swap";
    root.querySelector(".js-to-register").closest("p").before(swap);

    function fill(role) {
      emailEl.value = role.email;
      passwordEl.value = role.password;
      const other = role === ADMIN ? STANDARD : ADMIN;
      swap.innerHTML = `Dev login: <strong>${role.label}</strong> — <button type="button" class="link js-swap">use ${other.label.toLowerCase()}</button>`;
      swap.querySelector(".js-swap").addEventListener("click", () => fill(other));
    }

    fill(ADMIN); // default to admin every visit
    requestAnimationFrame(() => submitBtn.focus({ preventScroll: true }));
  } else {
    requestAnimationFrame(() => emailEl.focus({ preventScroll: true }));
  }
}

export function unmount() {}
