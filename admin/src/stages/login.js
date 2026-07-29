// Login screen — email + password against POST /api/v1/auth/login. On success the
// server sets the session cookie; we store the user in state and land on START.
// A link switches to the register screen.

import { Eye, EyeOff } from "lucide";
import { STAGES, store, isInternalAdmin } from "../state.ts";
import { login, me } from "../../../shared/api.js";
import { startGuestRun, completeClaimAfterAuth } from "../guest.ts";
import { isTouchScreen } from "../ui/field.js";
import { landingStage } from "../ui/landing.ts";
import { icon } from "../ui/icon.js";
import { button } from "../ui/button.ts";

// Show/hide toggle for a password field (audit A3), defined once here and shared
// by register.js and reset-password.js (like LOGIN_PHOTOS): a small ghost
// icon-button beside the input flips its type. aria-pressed carries the state;
// the label stays "Show password" so screen readers hear a consistent name.
// Markup contract: the input and this button sit together in a .js-pw-wrap row.
export function passwordToggleHtml() {
  return button({
    iconLeft: icon(Eye, { size: 16 }),
    variant: "ghost",
    size: "sm",
    hook: "js-toggle-pw",
    ariaLabel: "Show password",
    attrs: { "aria-pressed": "false" },
  });
}

// --- The shared entry field kit (entry-redesign Phase 2, Version A) ----------
// A compact boxed field: label row (with an optional right-aligned aside), the
// input, and its OWN message slot. DESIGN.md §5 reserves the big borderless
// `.input` for the session flow; a form wears this instead. Defined once here
// and shared with register.js, like passwordToggleHtml and googleButtonHtml.
// Markup contract: `.auth-field` > `.auth-field__top` + `.auth-input` + `.auth-err`,
// keyed by the field's own js- hook so an error finds its field.
//
// The wrapper is a plain element, NOT a <label>: the top row and the password
// wrapper both carry buttons (Forgot password?, Show password), and a <label>
// around a button folds that button's text into the input's accessible name.
// A screen reader was reading the login password box as "Password Forgot
// password? Show password". The label text is its own <label for>, so clicking
// it still focuses the input.
export function authField({ label, hook, type = "text", autocomplete = "off", optional = "", aside = "", placeholder = "", attrs = "" }) {
  return `
    <div class="auth-field">
      <span class="auth-field__top">
        <label class="field__label" for="${hook}">${label}${optional ? ` <span class="text-ink-mute">${optional}</span>` : ""}</label>
        ${aside}
      </span>
      <input id="${hook}" class="auth-input ${hook}" data-field="${hook}" type="${type}" autocomplete="${autocomplete}"
        placeholder="${placeholder}" aria-invalid="false" ${attrs} />
      <span class="auth-err" data-err="${hook}" hidden></span>
    </div>`;
}

export function authPasswordField({ label = "Password", hook = "js-password", autocomplete = "current-password", optional = "", aside = "" }) {
  return `
    <div class="auth-field">
      <span class="auth-field__top">
        <label class="field__label" for="${hook}">${label}${optional ? ` <span class="text-ink-mute">${optional}</span>` : ""}</label>
        ${aside}
      </span>
      <span class="auth-pw js-pw-wrap">
        <input id="${hook}" class="auth-input ${hook}" data-field="${hook}" type="password" autocomplete="${autocomplete}"
          aria-invalid="false" required />
        ${passwordToggleHtml()}
      </span>
      <span class="auth-err" data-err="${hook}" hidden></span>
    </div>`;
}

// Error plumbing for a form built from the kit above. `fail` marks one field and
// says what it needs; `alert` is the one form-level message, and it always
// carries a next step (the old screens had a single red line that said neither).
export function authFormErrors(form) {
  const alertEl = form.querySelector(".js-err");
  return {
    clear() {
      alertEl.hidden = true;
      form.querySelectorAll(".auth-err").forEach((el) => { el.hidden = true; el.textContent = ""; });
      form.querySelectorAll(".auth-input").forEach((el) => el.setAttribute("aria-invalid", "false"));
    },
    fail(hook, message) {
      form.querySelector(`[data-field="${hook}"]`)?.setAttribute("aria-invalid", "true");
      const el = form.querySelector(`[data-err="${hook}"]`);
      if (el) { el.textContent = message; el.hidden = false; }
    },
    focusFirst() {
      form.querySelector('[aria-invalid="true"]')?.focus();
    },
    // The message itself is set as text, never as markup: some of it comes back
    // from the server. The next step is ours, so it rides as HTML.
    alert(message, nextStepHtml = "") {
      alertEl.textContent = message;
      if (nextStepHtml) alertEl.insertAdjacentHTML("beforeend", ` ${nextStepHtml}`);
      alertEl.hidden = false;
    },
  };
}

export function wirePasswordToggles(scope) {
  scope.querySelectorAll(".js-toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".js-pw-wrap")?.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", String(show));
      btn.innerHTML = icon(show ? EyeOff : Eye, { size: 16 });
    });
  });
}

// "Continue with Google" (google-signin Phase 2), defined once here and shared by
// register.js (like passwordToggleHtml). An <a>, not a fetch: the whole flow is a
// full-page navigation to the server's OAuth start route, which 302s to Google and
// back. In dev the API is its own port (:3001) — localhost cookies ignore ports, so
// the session cookie set there reaches both Vite apps. The four-colour G ships as a
// static asset in both public dirs (the Lucide icon system is monochrome-only).
export function googleStartUrl() {
  const app = import.meta.env.BASE_URL.startsWith("/admin") ? "admin" : "customer";
  const base = import.meta.env.DEV ? "http://localhost:3001" : "";
  return `${base}/api/v1/auth/google/start?app=${app}`;
}

export function googleButtonHtml() {
  return `<a class="btn btn--ghost js-google" href="${googleStartUrl()}"><img src="${import.meta.env.BASE_URL}google-g.svg" alt="" aria-hidden="true" width="18" height="18" />Continue with Google</a>`;
}

// What the login screen says for each ?error= code a failed Google round-trip
// lands back with (the server only ever sends these stable codes).
const GOOGLE_ERROR_COPY = {
  "google-unavailable": "Google sign-in isn't set up yet. Use your email and password.",
  "google-denied": "Google sign-in was cancelled.",
  "google-unverified": "That Google account's email isn't verified with Google yet.",
  "account-off": "This account has been switched off. Ask your admin to switch it back on.",
  "rate-limited": "Too many attempts. Try again in a minute.",
};
const GOOGLE_ERROR_FALLBACK = "Google sign-in didn't finish. Please try again.";

// Optimised copies (1200px tall, ~90KB) of the /images Pexels originals live in
// admin/public/login/ — every auth screen shows the FIRST entry, deterministically,
// so the way in always looks the same (design-consolidation Phase 2, audit A4).
// Exported so the other auth screens draw from the same pool. Stored base-relative (no
// leading slash); each use site prefixes import.meta.env.BASE_URL ("/admin/") at
// render time so they load under the /admin/ mount instead of 404-ing at the site
// root. (Kept as bare strings — the prefix is applied in the template, not here,
// so importing this list never touches import.meta.env under the Node test runner.)
export const LOGIN_PHOTOS = [
  "login/pexels-alex-green-5699419.jpg",
  "login/pexels-cottonbro-4861338.jpg",
  "login/pexels-george-milton-6953779.jpg",
  "login/pexels-ketut-subiyanto-4623308.jpg",
  "login/pexels-sarah-chai-7267386.jpg",
];

export async function mount(root, { setState }) {
  // Login is a full-bleed split screen: form on the left, photo on the right.
  // Break the stage out of its centered/padded default for this screen only.
  root.classList.add("stage--auth");
  // One fixed photo, not a random pick — the auth screens should look the same
  // on every visit (design-consolidation Phase 2, audit A4).
  const photo = LOGIN_PHOTOS[0];
  root.innerHTML = `
    <div class="auth-split">
      <div class="auth-split__form">
        <div class="auth-panel l-stack l-stack--4">
          <div class="auth-card l-stack l-stack--5">
            <div class="auth-brand">
              <img class="auth-brand__logo" src="${import.meta.env.BASE_URL}logo.png" alt="" aria-hidden="true" />
              <h1 class="auth-brand__title">Welcome back</h1>
              <p class="auth-brand__sub">Log in to prep your next 1:1.</p>
            </div>
            <form class="l-stack l-stack--4 js-form" novalidate>
              <p class="auth-alert js-err" hidden></p>
              ${authField({ label: "Email", hook: "js-email", type: "email", autocomplete: "username", attrs: "required" })}
              ${authPasswordField({
                aside: `<button type="button" class="link text-sm js-to-forgot">Forgot password?</button>`,
              })}
              ${button({ label: "Log in", type: "submit", hook: "js-submit" })}
              <p class="intake-or">or</p>
              ${googleButtonHtml()}
            </form>
            <div class="auth-panel__foot l-stack l-stack--2">
              <p class="text-ink-dim text-sm">
                New to Sero?
                <button type="button" class="link js-to-register">Create an account</button>
              </p>
              <p class="text-ink-dim text-sm">
                Or <button type="button" class="link js-try-guest">prep a 1:1 free, no account needed</button>.
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
  const emailEl = root.querySelector(".js-email");
  const passwordEl = root.querySelector(".js-password");
  const submitBtn = root.querySelector(".js-submit");
  const errors = authFormErrors(form);

  // The one form-level message. A wrong password now ends with a way forward
  // instead of a bare red line (entry-redesign Phase 2, plan problem 5); the
  // link is wired after every render because the alert is rebuilt each time.
  const RESET_STEP = `Or <button type="button" class="link js-alert-forgot">reset your password</button>.`;
  function showError(message, nextStepHtml = "") {
    errors.alert(message, nextStepHtml);
    root.querySelector(".js-alert-forgot")
      ?.addEventListener("click", () => setState({ stage: STAGES.FORGOT_PASSWORD }));
  }

  // A failed Google round-trip lands back here with ?error=<code> (google-signin
  // Phase 2). Show the friendly line in the normal error spot, then tidy the URL
  // so a refresh doesn't re-scold.
  const googleError = new URLSearchParams(window.location.search).get("error");
  if (googleError) {
    showError(GOOGLE_ERROR_COPY[googleError] || GOOGLE_ERROR_FALLBACK);
    history.replaceState(null, "", window.location.pathname);
  }

  async function onSubmit(e) {
    e.preventDefault();
    errors.clear();
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    // Each empty field says what IT needs, under itself. One shared line above
    // the button could never tell you which of the two was the problem.
    if (!email) errors.fail("js-email", "Enter the email you use for work.");
    if (!password) errors.fail("js-password", "Enter your password.");
    if (!email || !password) { errors.focusFirst(); return; }

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
      // admin-lockdown Phase 3 — the admin bundle is internal-only. A manager or member who
      // signs in HERE belongs in the customer app; navigate there rather than seat them in the
      // admin shell. (In prod the server already 302s a non-internal /admin load; this points
      // the signpost right at the source so there's no bounce, and gives dev the same result.)
      // Guarded by the build's base URL so the shared customer bundle ("/") is untouched.
      if (import.meta.env.BASE_URL.startsWith("/admin") && !isInternalAdmin(identity)) {
        // In dev the customer app is its own server; "/" would bounce straight back to
        // /admin and strand them on the wrong-door page. Go to the real destination.
        window.location.href = import.meta.env.DEV ? "http://localhost:3002/" : "/";
        return;
      }
      // Land in the SAME place a fresh reload would (audit B1 split-brain): one resolver,
      // the per-app member home injected into store.memberHome by each main.js. A manager
      // gets their Home (START), where the first-run empty state greets a newcomer — never
      // the setup wizard. The ?? guards a stage loaded before boot set memberHome.
      setState({ user: identity, stage: landingStage(identity, store.memberHome ?? STAGES.RUNS) });
    } catch (e2) {
      showError(
        e2.message || "That email and password don't match. Check them and try again.",
        RESET_STEP,
      );
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
    }
  }

  form.addEventListener("submit", onSubmit);
  root.querySelector(".js-to-register").addEventListener("click", () => setState({ stage: STAGES.REGISTER }));
  root.querySelector(".js-to-forgot").addEventListener("click", () => setState({ stage: STAGES.FORGOT_PASSWORD }));
  // The guest lane (guest-run Phase 2): straight into intake, no account. The
  // entry logic lives in guest.ts, shared with the start screen (welcome.ts).
  root.querySelector(".js-try-guest").addEventListener("click", () => startGuestRun(setState));
  wirePasswordToggles(root);

  // Dev convenience — prefill a local test account so you're never locked out while
  // testing, cycling through the three-login setup: MANAGER (the real end user under
  // test) → ADMIN (Carl / internal) → MEMBER (a managed team member). The default pick
  // matches the app you're on: the customer app defaults to Manager, the internal admin
  // app defaults to Admin — a manager signing in HERE only reaches the "wrong app"
  // signpost, so prefilling them was a dead end. Credentials come from your local .env only
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
    // A small dev-only line under the form showing ALL test logins at once. Click one
    // to fill it; the current pick is bold. Reuses the footer's `.link` style.
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

    const defaultLabel = import.meta.env.BASE_URL.startsWith("/admin") ? "Admin" : "Manager";
    fill(Math.max(0, DEV_ACCOUNTS.findIndex((a) => a.label === defaultLabel)));
    if (!isTouchScreen()) requestAnimationFrame(() => submitBtn.focus({ preventScroll: true }));
  } else if (!isTouchScreen()) {
    // Desktop only — on a phone this pops the keyboard over the page (phone walk 2026-07-11).
    requestAnimationFrame(() => emailEl.focus({ preventScroll: true }));
  }
}

export function unmount(root) {
  root?.classList.remove("stage--auth");
}
