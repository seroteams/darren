// Login screen — email + password against POST /api/v1/auth/login. On success the
// server sets the session cookie; we store the user in state and land on START.
// A link switches to the register screen.

import { STAGES, store } from "../state.js";
import { login, me } from "../../../shared/api.js";
import { startGuestRun, completeClaimAfterAuth } from "../guest.ts";
import { isTouchScreen } from "../ui/field.js";
import { landingStage } from "../ui/landing.ts";

// Optimised copies (1200px tall, ~90KB) of the /images Pexels originals live in
// admin/public/login/ — one is picked at random per visit. Exported so the
// start screen (welcome.ts) draws from the same pool.
export const LOGIN_PHOTOS = [
  "/login/pexels-alex-green-5699419.jpg",
  "/login/pexels-cottonbro-4861338.jpg",
  "/login/pexels-george-milton-6953779.jpg",
  "/login/pexels-ketut-subiyanto-4623308.jpg",
  "/login/pexels-sarah-chai-7267386.jpg",
];

export async function mount(root, { setState }) {
  // Login is a full-bleed split screen: form on the left, photo on the right.
  // Break the stage out of its centered/padded default for this screen only.
  root.classList.add("stage--auth");
  const photo = LOGIN_PHOTOS[Math.floor(Math.random() * LOGIN_PHOTOS.length)];
  root.innerHTML = `
    <div class="auth-split">
      <div class="auth-split__form">
        <div class="auth-panel l-stack l-stack--6">
          <div class="auth-brand">
            <img class="auth-brand__logo" src="/logo.png" alt="" aria-hidden="true" />
            <h1 class="auth-brand__title">Welcome back</h1>
            <p class="auth-brand__sub">Log in to prep your next 1:1.</p>
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
            <button type="button" class="link js-to-forgot">Forgot password?</button>
          </p>
          <p class="text-ink-dim text-sm">
            No account yet?
            <button type="button" class="link js-to-register">Create one</button>
          </p>
          <p class="text-ink-dim text-sm">
            Just curious?
            <button type="button" class="link js-try-guest">Try it — no account needed</button>
          </p>
        </div>
      </div>
      <div class="auth-split__media" aria-hidden="true">
        <img class="auth-split__img" src="${photo}" alt="" onerror="this.remove()" />
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
      // Re-read identity from /auth/me so the user object carries isSuperadmin (PG7 nav
      // visibility) the same as a fresh boot does; fall back to the login user if it fails.
      let identity = user;
      try { identity = await me(); } catch { /* keep the login user */ }
      // A guest saving their finished run (guest-run Phase 3): claim it and land on
      // it. A failed claim falls through to the normal landing — never a dead end.
      if (await completeClaimAfterAuth(identity, setState)) return;
      // Land in the SAME place a fresh reload would (audit B1 split-brain): one resolver,
      // the per-app member home injected into store.memberHome by each main.js. A manager
      // gets their Home (START), where the first-run empty state greets a newcomer — never
      // the setup wizard. The ?? guards a stage loaded before boot set memberHome.
      setState({ user: identity, stage: landingStage(identity, store.memberHome ?? STAGES.RUNS) });
    } catch (e2) {
      showError(e2.message || "Could not log in.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  }

  form.addEventListener("submit", onSubmit);
  root.querySelector(".js-to-register").addEventListener("click", () => setState({ stage: STAGES.REGISTER }));
  root.querySelector(".js-to-forgot").addEventListener("click", () => setState({ stage: STAGES.FORGOT_PASSWORD }));
  // The guest lane (guest-run Phase 2): straight into intake, no account. The
  // entry logic lives in guest.ts, shared with the start screen (welcome.ts).
  root.querySelector(".js-try-guest").addEventListener("click", () => startGuestRun(setState));

  // Dev convenience — prefill a local test account so you're never locked out while
  // testing, cycling through the three-login setup: MANAGER (the real end user under
  // test) → ADMIN (Carl / internal) → MEMBER (a managed team member). Every visit
  // defaults to Manager. Credentials come from your local .env only
  // (VITE_DEV_LOGIN_MANAGER_* / _ADMIN_* / _MEMBER_* — see .env.example); no
  // credentials live in source. Accounts with unset vars just drop out of the cycle;
  // with none set the prefill doesn't appear. The whole block is stripped from
  // production builds (import.meta.env.DEV is false there).
  const devEnv = import.meta.env.DEV ? import.meta.env : {};
  const DEV_ACCOUNTS = [
    { label: "Manager", email: devEnv.VITE_DEV_LOGIN_MANAGER_EMAIL, password: devEnv.VITE_DEV_LOGIN_MANAGER_PASSWORD || "" },
    { label: "Admin", email: devEnv.VITE_DEV_LOGIN_ADMIN_EMAIL, password: devEnv.VITE_DEV_LOGIN_ADMIN_PASSWORD || "" },
    { label: "Member", email: devEnv.VITE_DEV_LOGIN_MEMBER_EMAIL, password: devEnv.VITE_DEV_LOGIN_MEMBER_PASSWORD || "" },
  ].filter((a) => a.email);
  if (DEV_ACCOUNTS.length > 0) {
    // A small dev-only line under the form showing ALL test logins at once — click one
    // to fill it. The current pick is bold; reuses the `.link` style from "Create one".
    const swap = document.createElement("p");
    swap.className = "text-ink-dim text-sm js-dev-swap";
    root.querySelector(".js-to-register").closest("p").before(swap);

    function fill(i) {
      const acct = DEV_ACCOUNTS[i];
      emailEl.value = acct.email;
      passwordEl.value = acct.password;
      swap.innerHTML = "Dev login: " + DEV_ACCOUNTS.map((a, j) =>
        j === i
          ? `<strong>${a.label}</strong>`
          : `<button type="button" class="link js-swap" data-i="${j}">${a.label}</button>`
      ).join(" · ");
      swap.querySelectorAll(".js-swap").forEach((b) =>
        b.addEventListener("click", () => fill(Number(b.dataset.i)))
      );
    }

    fill(0); // default to the manager every visit
    if (!isTouchScreen()) requestAnimationFrame(() => submitBtn.focus({ preventScroll: true }));
  } else if (!isTouchScreen()) {
    // Desktop only — on a phone this pops the keyboard over the page (phone walk 2026-07-11).
    requestAnimationFrame(() => emailEl.focus({ preventScroll: true }));
  }
}

export function unmount(root) {
  root?.classList.remove("stage--auth");
}
