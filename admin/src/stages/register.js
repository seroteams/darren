// Register screen — name + email + password (+ optional company) against
// POST /api/v1/auth/register. Register does NOT set the cookie, so on success we
// immediately log in with the same credentials to land the user in. A link
// switches back to the login screen.

import { STAGES } from "../state.js";
import { register, login } from "../../../shared/api.js";

export async function mount(root, { setState }) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8 auth-card">
      <header class="page-header">
        <h1 class="h1">Create your account</h1>
        <div class="text-ink-dim text-sm">This also creates your company — you'll be its owner.</div>
      </header>
      <form class="card-flat space-y-3 js-form" novalidate>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Your name</span>
          <input class="input js-name" type="text" autocomplete="name" required />
        </label>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Company <span class="text-ink-mute">(optional)</span></span>
          <input class="input js-company" type="text" autocomplete="organization" placeholder="Defaults to your name's company" />
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
      // Register doesn't set the cookie — log in to get the session and land in.
      const { user } = await login({ email, password });
      setState({ user, stage: STAGES.START });
    } catch (e2) {
      showError(e2.message || "Could not create your account.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  }

  form.addEventListener("submit", onSubmit);
  root.querySelector(".js-to-login").addEventListener("click", () => setState({ stage: STAGES.LOGIN }));

  requestAnimationFrame(() => nameEl.focus({ preventScroll: true }));
}

export function unmount() {}
