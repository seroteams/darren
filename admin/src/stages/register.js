// Register screen — name + email + password (+ optional company) against
// POST /api/v1/auth/register. Register does NOT set the cookie, so on success we
// immediately log in with the same credentials to land the user in. A link
// switches back to the login screen.

import { STAGES, store, isInternalAdmin } from "../state.ts";
import { register, login } from "../../../shared/api.js";
import { SECTORS, findSector } from "../../../shared/sectors.ts";
import { completeClaimAfterAuth } from "../guest.ts";
import { isTouchScreen } from "../ui/field.js";
import { landingStage } from "../ui/landing.ts";
import {
  LOGIN_PHOTOS,
  wirePasswordToggles,
  googleButtonHtml,
  authField,
  authPasswordField,
  authFormErrors,
} from "./login.js";
import { button } from "../ui/button.ts";

export async function mount(root, { setState }) {
  // Same full-bleed .auth-split brand shell as login.js (design-consolidation
  // Phase 2, audit A1) — the old markup wore a card class that no CSS defined,
  // so signup dropped the costume mid-flow.
  root.classList.add("stage--auth");
  const photo = LOGIN_PHOTOS[0];
  root.innerHTML = `
    <div class="auth-split">
      <div class="auth-split__form">
        <div class="auth-panel l-stack l-stack--4">
          <div class="auth-card l-stack l-stack--5">
            <div class="auth-brand">
              <img class="auth-brand__logo" src="${import.meta.env.BASE_URL}logo.png" alt="" aria-hidden="true" />
              <h1 class="auth-brand__title">Create your account</h1>
              <p class="auth-brand__sub">Your account comes with a private space for your company. You're the admin.</p>
            </div>
            <p class="text-ink-dim text-sm">Joining an existing team? Use the invite link your manager sent you.</p>
            <form class="l-stack l-stack--4 js-form" novalidate>
              <p class="auth-alert js-err" hidden></p>
              ${authField({ label: "Your name", hook: "js-name", autocomplete: "name", attrs: "required" })}
              ${authField({ label: "Company", hook: "js-company", autocomplete: "organization", optional: "(optional)", placeholder: "Thriving Company Co Ltd" })}
              ${authField({ label: "Sector", hook: "js-sector", optional: "(optional)", placeholder: "Start typing, for example Healthcare", attrs: 'list="register-sector-list"' })}
              <datalist id="register-sector-list">
                ${SECTORS.map((s) => `<option value="${s.label}"></option>`).join("")}
              </datalist>
              ${authField({ label: "Email", hook: "js-email", type: "email", autocomplete: "username", attrs: "required" })}
              ${authPasswordField({ optional: "(at least 8 characters)", autocomplete: "new-password" })}
              ${button({ label: "Create account", type: "submit", hook: "js-submit" })}
              <p class="text-ink-dim text-sm">
                By creating an account you agree to how Sero handles your data.
                <button type="button" class="link js-privacy">Read the privacy note</button>.
              </p>
              <p class="intake-or">or</p>
              ${googleButtonHtml()}
            </form>
            <div class="auth-panel__foot">
              <p class="text-ink-dim text-sm">
                Already have an account?
                <button type="button" class="link js-to-login">Log in</button>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="auth-split__media" aria-hidden="true">
        <img class="auth-split__img" src="${import.meta.env.BASE_URL}${photo}" alt="" onerror="this.remove()" />
      </div>
    </div>
  `;

  const form = root.querySelector(".js-form");
  const nameEl = root.querySelector(".js-name");
  const companyEl = root.querySelector(".js-company");
  const sectorEl = root.querySelector(".js-sector");
  const emailEl = root.querySelector(".js-email");
  const passwordEl = root.querySelector(".js-password");
  const submitBtn = root.querySelector(".js-submit");
  const errors = authFormErrors(form);

  // One form-level message, and it carries the next step (entry-redesign Phase 2).
  // The alert is rebuilt on every failure, so its link is wired each time.
  const LOGIN_STEP = `<button type="button" class="link js-alert-login">Log in instead</button>.`;
  function showError(message, nextStepHtml = "") {
    errors.alert(message, nextStepHtml);
    root.querySelector(".js-alert-login")
      ?.addEventListener("click", () => setState({ stage: STAGES.LOGIN }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    errors.clear();
    const name = nameEl.value.trim();
    const company = companyEl.value.trim();
    const typedSector = sectorEl.value.trim();
    const sector = findSector(typedSector)?.id ?? "";
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    // Each field says what IT needs, under itself, instead of one line naming
    // three fields and leaving you to work out which one you missed.
    if (!name) errors.fail("js-name", "Tell us what to call you.");
    if (!email) errors.fail("js-email", "Enter the email you use for work.");
    if (!password) errors.fail("js-password", "Pick a password of at least 8 characters.");
    else if (password.length < 8) errors.fail("js-password", "That is a bit short. Use at least 8 characters.");
    // The server would just drop an unrecognised sector rather than block the signup, but
    // saying so here beats letting someone type "Baking" and never learn it didn't stick.
    if (typedSector && !sector) errors.fail("js-sector", "Pick a sector from the list, or leave it blank.");
    if (form.querySelector('[aria-invalid="true"]')) { errors.focusFirst(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating…";
    try {
      await register({ email, name, password, company, sector });
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
      // The one failure with a real way forward is "that email is already taken",
      // so the log-in step is offered on that and nothing else: a generic outage
      // is not solved by sending someone to a login they also cannot complete.
      const message = e2.message || "Couldn't create your account. Try again. Nothing you typed is lost.";
      showError(message, /already has an account/i.test(message) ? LOGIN_STEP : "");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  }

  form.addEventListener("submit", onSubmit);
  root.querySelector(".js-to-login").addEventListener("click", () => setState({ stage: STAGES.LOGIN }));
  root.querySelector(".js-privacy").addEventListener("click", () => setState({ stage: STAGES.PRIVACY }));
  wirePasswordToggles(root);

  // Desktop only — on a phone this pops the keyboard over the page (phone walk 2026-07-11).
  if (!isTouchScreen()) requestAnimationFrame(() => nameEl.focus({ preventScroll: true }));
}

export function unmount(root) {
  root?.classList.remove("stage--auth");
}
