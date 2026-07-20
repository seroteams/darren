// Register screen — name + email + password (+ optional company) against
// POST /api/v1/auth/register. Register does NOT set the cookie, so on success we
// immediately log in with the same credentials to land the user in. A link
// switches back to the login screen.

import { STAGES, store, isInternalAdmin } from "../state.js";
import { register, login } from "../../../shared/api.js";
import { completeClaimAfterAuth } from "../guest.ts";
import { isTouchScreen } from "../ui/field.js";
import { landingStage } from "../ui/landing.ts";

export async function mount(root, { setState }) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8 auth-card">
      <header class="page-header">
        <h1 class="h1">Create your account</h1>
        <div class="text-ink-dim">Your account comes with a private space for your company — you're the admin.</div>
      </header>
      <form class="card-flat space-y-3 js-form" novalidate>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Your name</span>
          <input class="input js-name" type="text" autocomplete="name" required />
        </label>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Company <span class="text-ink-mute">(optional)</span></span>
          <input class="input js-company" type="text" autocomplete="organization" placeholder="Leave blank and we'll name it after you" />
        </label>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Email</span>
          <input class="input js-email" type="email" autocomplete="username" required />
        </label>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Password <span class="text-ink-mute">(at least 8 characters)</span></span>
          <input class="input js-password" type="password" autocomplete="new-password" required />
        </label>
        <p class="js-err text-negative text-sm" hidden></p>
        <button type="submit" class="btn js-submit">Create account</button>
      </form>
      <p class="text-ink-dim text-sm">
        By creating an account you agree to how Sero handles your data.
        <button type="button" class="link js-privacy">Read the privacy note</button>.
      </p>
      <p class="text-ink-dim text-sm">
        Already have an account?
        <button type="button" class="link js-to-login">Log in</button>
      </p>
    </div>
  `;

  const form = root.querySelector(".js-form");
  const nameEl = root.querySelector(".js-name");
  const companyEl = root.querySelector(".js-company");
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
    const name = nameEl.value.trim();
    const company = companyEl.value.trim();
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    if (!name || !email || !password) { showError("Fill in your name, email, and password."); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating…";
    try {
      await register({ email, name, password, company });
      // Register doesn't set the cookie — log in to get the session and land in. Land by
      // role like login.js does, so a first-time member reaches their Home (not an admin
      // screen the router immediately bounces). A self-signup owner still lands on START.
      const { user } = await login({ email, password });
      // A guest saving their finished run (guest-run Phase 3): claim it and land on
      // it. A failed claim falls through to the normal landing — never a dead end.
      if (await completeClaimAfterAuth(user, setState)) return;
      // admin-lockdown Phase 3 — a self-signup is always a manager (their new company's owner),
      // who belongs in the customer app, never the internal admin shell. If this register ran in
      // the admin bundle, navigate out to "/". Guarded by the build base so the shared customer
      // bundle ("/") keeps seating a new manager on its own START.
      if (import.meta.env.BASE_URL.startsWith("/admin") && !isInternalAdmin(user)) {
        window.location.href = "/";
        return;
      }
      // Land in the SAME place a fresh reload would (audit B1): one resolver, the per-app
      // member home injected into store.memberHome by each main.js. A brand-new manager
      // reaches their Home (START) and its first-run empty state, not the setup wizard.
      setState({ user, stage: landingStage(user, store.memberHome ?? STAGES.RUNS) });
    } catch (e2) {
      showError(e2.message || "Couldn't create your account. Try again — nothing you typed is lost.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  }

  form.addEventListener("submit", onSubmit);
  root.querySelector(".js-to-login").addEventListener("click", () => setState({ stage: STAGES.LOGIN }));
  root.querySelector(".js-privacy").addEventListener("click", () => setState({ stage: STAGES.PRIVACY }));

  // Desktop only — on a phone this pops the keyboard over the page (phone walk 2026-07-11).
  if (!isTouchScreen()) requestAnimationFrame(() => nameEl.focus({ preventScroll: true }));
}

export function unmount() {}
