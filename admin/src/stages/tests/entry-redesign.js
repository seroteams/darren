// Test: "The way in. Two versions" — a redesign of the entry set (log in, create
// account, and the free no-account front door). Mock only: hardcoded state, zero API
// calls, nothing saved, no routing. Opened from the /test gallery.
//
// Why this prototype exists — what today's screens get wrong (measured against
// DESIGN.md, not taste):
//   1 · The fields use the WRONG input variant. `.input` is the big borderless session
//       field (clamp 20-28px on a bottom rule); DESIGN.md §5 reserves that for the
//       session flow and gives forms the compact boxed input. Biggest single cause of
//       the odd look, and register wears four of them.
//   2 · Four ways in with no pecking order: Log in, Continue with Google, Create one,
//       Try it free.
//   3 · Two stacked divider rules, and the second is not an "or" — a plain link is
//       wearing `.intake-or` divider furniture.
//   4 · No card. The form floats on the page tint (DESIGN.md §4 wants surface on page).
//   5 · One shared error line above the button, so it never says which field is wrong
//       or what to do next.
//   6 · `.link` is not defined in any stylesheet, so "Create one" and "Try it free"
//       render as plain grey text. Fixed here as `.er-link`.
//   7 · `.auth-brand__title` sets size and weight but not `--type-family-display`, so
//       "Welcome back" renders in Inter, not Bricolage. Fixed here.
//
// Two versions to choose between:
//   A · Matching set    — today's three screens and routes, dressed to match: one card,
//                         boxed fields, one blue action, one divider, a grouped footer.
//   B · One front door  — a single screen. Log in and Create account are two tabs on
//                         the same card, and the free no-account path sits under it,
//                         always visible, never competing with the blue action.
//
// Design contract: docs/plans/doing/entry-redesign/plan.md.

import { Eye, EyeOff } from "lucide";
import { icon } from "../../ui/icon.js";
import { LOGIN_PHOTOS } from "../login.js";

const BASE = import.meta.env.BASE_URL;
const PHOTO = `${BASE}${LOGIN_PHOTOS[0]}`;
const LOGO = `${BASE}logo.png`;
const GOOGLE_G = `${BASE}google-g.svg`;

// ---- Prototype CSS (scoped .er-) ----------------------------------------------------
// Tokens only, no hex. The .btn / .btn--ghost / .intake-or / .l-stack / .field__label
// recipes are the real shipped ones, reused rather than rebuilt.
const STYLE = `
  .er-wrap { display:flex; flex-direction:column; gap:var(--sero-space-5); }

  /* Prototype chrome — the switches above the mock */
  .er-bar { display:flex; flex-wrap:wrap; gap:var(--sero-space-5); align-items:flex-end; }
  .er-seg-wrap { display:flex; flex-direction:column; gap:var(--sero-space-1); }
  .er-seg-label { font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); }
  .er-seg { display:inline-flex; gap:var(--sero-space-0-5); padding:var(--sero-space-0-5);
    background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--sero-radius-sm); }
  .er-seg__btn { font:inherit; font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); background:transparent; border:none;
    border-radius:var(--sero-radius-sm); padding:var(--sero-space-1) var(--sero-space-3);
    cursor:pointer; white-space:nowrap; }
  .er-seg__btn:hover { color:var(--color-ink); }
  .er-seg__btn[aria-pressed="true"] { background:var(--color-accent-soft);
    color:var(--color-accent-dark); font-weight:var(--type-weight-semibold); }
  .er-seg__btn:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .er-note { margin:0; max-width:var(--measure-lede); font-size:var(--type-body-sm);
    color:var(--color-ink-dim); line-height:var(--type-leading-normal); }

  /* The framed screen */
  .er-frame { border:1px solid var(--color-border); border-radius:var(--radius-frame);
    overflow:hidden; background:var(--color-bg); box-shadow:var(--shadow-lift); }
  .er-frame--phone { max-width:390px; margin-inline:auto; }
  .er-split { display:grid; grid-template-columns:1fr 1fr; min-height:680px; }
  .er-split--narrow { grid-template-columns:1fr; min-height:620px; }
  .er-split--narrow .er-split__media { display:none; }
  .er-split__form { display:grid; place-items:center;
    padding:clamp(var(--sero-space-5), 4vw, var(--sero-space-10)); }
  .er-split__media { position:relative; overflow:hidden;
    background:linear-gradient(135deg, var(--sero-primary-800), var(--sero-mint-800)); }
  .er-split__img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
    object-position:top; display:block; }

  /* Column: the card, plus (version B) the persistent free-entry block under it */
  .er-col { display:flex; flex-direction:column; align-items:center;
    gap:var(--sero-space-4); width:100%; }

  /* Card — surface on page, 12px radius, 24px padding (DESIGN.md §5) */
  .er-card { width:100%; max-width:400px; box-sizing:border-box;
    background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-card); padding:var(--space-card-pad); }
  .er-card .btn { width:100%; justify-content:center; }

  /* Brand block — display family applied, unlike the live screen */
  .er-brand { display:flex; flex-direction:column; align-items:center; text-align:center;
    gap:var(--sero-space-2); }
  .er-logo { width:44px; height:44px; object-fit:contain; display:block; }
  .er-title { margin:0; font-family:var(--type-family-display); font-size:var(--type-h2);
    font-weight:var(--type-weight-semibold); line-height:var(--type-leading-tight);
    letter-spacing:var(--type-tracking-tight); color:var(--color-ink); }
  .er-sub { margin:0; font-size:var(--type-body); color:var(--color-ink-dim);
    line-height:var(--type-leading-normal); }

  /* Compact boxed field — the variant DESIGN.md §5 asks for on a form */
  .er-field { display:flex; flex-direction:column; gap:var(--sero-space-2); }
  .er-field__top { display:flex; align-items:baseline; justify-content:space-between;
    gap:var(--sero-space-3); }
  .er-optional { font-weight:var(--type-weight-regular); color:var(--color-ink-mute); }
  .er-input { width:100%; box-sizing:border-box; font:inherit; font-size:var(--type-body);
    line-height:var(--type-leading-normal); color:var(--color-ink);
    background:var(--color-surface); border:1px solid var(--color-border-strong);
    border-radius:var(--radius-input); padding:var(--sero-space-3);
    transition:border-color var(--dur-instant) ease-out; }
  .er-input::placeholder { color:var(--color-ink-mute); }
  .er-input:focus { border-color:var(--color-accent); box-shadow:var(--sero-shadow-focus);
    outline:none; }
  .er-input[aria-invalid="true"] { border-color:var(--color-danger); }
  .er-pw { position:relative; display:block; }
  .er-pw .er-input { padding-right:var(--sero-space-12); }
  .er-pw__toggle { position:absolute; top:50%; right:var(--sero-space-1);
    transform:translateY(-50%); display:grid; place-items:center; width:36px; height:36px;
    background:transparent; border:none; border-radius:var(--sero-radius-sm);
    color:var(--color-ink-mute); cursor:pointer; }
  .er-pw__toggle:hover { color:var(--color-ink); background:var(--color-accent-soft); }
  .er-pw__toggle:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .er-err { font-size:var(--type-body-sm); color:var(--color-negative-text); }

  /* Form-level alert — stays until dealt with, says what to do next (DESIGN.md §5) */
  .er-alert { margin:0; font-size:var(--type-body-sm); color:var(--color-negative-text);
    background:var(--sero-coral-100); border:1px solid var(--color-coral-line);
    border-radius:var(--sero-radius-sm); padding:var(--sero-space-3);
    line-height:var(--type-leading-normal); }
  .er-alert .er-link { color:var(--color-negative-text); }

  /* Link — the live app's .link class has no CSS anywhere, so this is the fix */
  .er-link { font:inherit; font-size:inherit; font-weight:var(--type-weight-semibold);
    color:var(--color-accent-dark); background:none; border:none; padding:0; cursor:pointer;
    border-radius:var(--sero-radius-sm); }
  .er-link:hover { text-decoration:underline; }
  .er-link:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }

  /* Footer — one grouped block instead of two stacked dividers */
  .er-foot { display:flex; flex-direction:column; gap:var(--sero-space-2); text-align:center;
    border-top:1px solid var(--color-border); padding-top:var(--sero-space-4); }
  .er-foot p { margin:0; font-size:var(--type-body-sm); color:var(--color-ink-dim);
    line-height:var(--type-leading-normal); }
  .er-quiet { margin:0; font-size:var(--type-body-sm); color:var(--color-ink-dim);
    text-align:center; line-height:var(--type-leading-normal); }
  .er-google img { width:18px; height:18px; display:block; }

  /* Version B — the two-mode switch on one card */
  .er-tabs { display:grid; grid-template-columns:1fr 1fr; gap:var(--sero-space-0-5);
    padding:var(--sero-space-0-5); background:var(--color-bg);
    border:1px solid var(--color-border); border-radius:var(--sero-radius-sm); }
  .er-tab { font:inherit; font-size:var(--type-body-sm); font-weight:var(--type-weight-medium);
    color:var(--color-ink-dim); background:transparent; border:none;
    border-radius:var(--sero-radius-sm); padding:var(--sero-space-2) var(--sero-space-3);
    cursor:pointer; }
  .er-tab[aria-selected="true"] { background:var(--color-surface); color:var(--color-ink);
    font-weight:var(--type-weight-semibold); box-shadow:var(--sero-shadow-xs); }
  .er-tab:focus-visible { box-shadow:var(--sero-shadow-focus); outline:none; }
  .er-guest { width:100%; max-width:400px; display:flex; flex-direction:column;
    gap:var(--sero-space-2); }
  .er-guest .btn { width:100%; justify-content:center; }
`;

// ---- Mock state ---------------------------------------------------------------------
let version = "a";     // "a" = matching set, "b" = one front door
let screen = "login";  // version A only: login | register | front
let tab = "login";     // version B only: login | register
let width = "desktop"; // desktop | phone

const NOTES = {
  a: "Version A. The same three screens and the same routes as today, dressed to match: one card on the page tint, compact boxed fields, one blue action, one divider, and a single grouped footer. The links inside the mock work, so you can walk between the three.",
  b: "Version B. One front door instead of three screens. Log in and Create account are two tabs on the same card, and the free no-account path sits under the card, always visible but never competing with the blue action.",
};

// ---- Pieces --------------------------------------------------------------------------

const brand = (title, sub) => `
  <div class="er-brand">
    <img class="er-logo" src="${LOGO}" alt="" aria-hidden="true" onerror="this.remove()" />
    <h1 class="er-title">${title}</h1>
    <p class="er-sub">${sub}</p>
  </div>`;

const field = ({ label, name, type = "text", autocomplete = "off", optional = "", aside = "", placeholder = "" }) => `
  <label class="er-field">
    <span class="er-field__top">
      <span class="field__label">${label}${optional ? ` <span class="er-optional">${optional}</span>` : ""}</span>
      ${aside}
    </span>
    <input class="er-input" data-name="${name}" type="${type}" autocomplete="${autocomplete}"
      placeholder="${placeholder}" aria-invalid="false" />
    <span class="er-err" data-err="${name}" hidden></span>
  </label>`;

const passwordField = ({ label = "Password", name = "password", autocomplete = "current-password", optional = "", aside = "" }) => `
  <label class="er-field">
    <span class="er-field__top">
      <span class="field__label">${label}${optional ? ` <span class="er-optional">${optional}</span>` : ""}</span>
      ${aside}
    </span>
    <span class="er-pw">
      <input class="er-input" data-name="${name}" type="password" autocomplete="${autocomplete}"
        aria-invalid="false" />
      <button type="button" class="er-pw__toggle js-toggle-pw" aria-pressed="false"
        aria-label="Show password">${icon(Eye, { size: 18 })}</button>
    </span>
    <span class="er-err" data-err="${name}" hidden></span>
  </label>`;

const googleButton = () => `
  <button type="button" class="btn btn--ghost er-google js-noop">
    <img src="${GOOGLE_G}" alt="" aria-hidden="true" width="18" height="18" onerror="this.remove()" />
    Continue with Google
  </button>`;

const forgotAside = `<button type="button" class="er-link js-noop">Forgot password?</button>`;

// The two field sets, shared by both versions.
const loginFields = () => `
  ${field({ label: "Email", name: "email", type: "email", autocomplete: "username" })}
  ${passwordField({ aside: forgotAside })}`;

const registerFields = () => `
  ${field({ label: "Your name", name: "name", autocomplete: "name" })}
  ${field({ label: "Company", name: "company", autocomplete: "organization", optional: "(optional)", placeholder: "e.g. Thriving Company Co Ltd" })}
  ${field({ label: "Email", name: "email", type: "email", autocomplete: "username" })}
  ${passwordField({ optional: "(at least 8 characters)", autocomplete: "new-password" })}`;

// ---- Version A: three screens, one shape --------------------------------------------

const loginScreenA = () => `
  <div class="er-col">
    <div class="er-card l-stack l-stack--5">
      ${brand("Welcome back", "Log in to prep your next 1:1.")}
      <form class="l-stack js-form" data-form="login" novalidate>
        <p class="er-alert" data-alert hidden></p>
        ${loginFields()}
        <button type="submit" class="btn js-submit">Log in</button>
      </form>
      <p class="intake-or">or</p>
      ${googleButton()}
      <div class="er-foot">
        <p>New to Sero? <button type="button" class="er-link js-go" data-go="register">Create an account</button></p>
        <p>Or <button type="button" class="er-link js-go" data-go="front">prep a 1:1 free, no account needed</button>.</p>
      </div>
    </div>
  </div>`;

const registerScreenA = () => `
  <div class="er-col">
    <div class="er-card l-stack l-stack--5">
      ${brand("Create your account", "You get a private space for your company, and you are its admin.")}
      <form class="l-stack js-form" data-form="register" novalidate>
        <p class="er-alert" data-alert hidden></p>
        ${registerFields()}
        <button type="submit" class="btn js-submit">Create account</button>
      </form>
      <p class="intake-or">or</p>
      ${googleButton()}
      <div class="er-foot">
        <p>Already have an account? <button type="button" class="er-link js-go" data-go="login">Log in</button></p>
        <p>What you type stays private to you. <button type="button" class="er-link js-noop">Privacy</button></p>
      </div>
    </div>
  </div>`;

const frontScreenA = () => `
  <div class="er-col">
    <div class="er-card l-stack l-stack--5">
      ${brand("Walk into your next 1:1 well prepared.", "Type a few rough notes. Sero turns them into a clear brief and sharper questions, in about two minutes.")}
      <div class="l-stack l-stack--2">
        <button type="button" class="btn js-noop">Prep a 1:1 free, no account needed</button>
        <button type="button" class="btn btn--ghost js-go" data-go="register">Create an account</button>
      </div>
      <div class="er-foot">
        <p>Already using Sero? <button type="button" class="er-link js-go" data-go="login">Log in</button></p>
        <p>What you type stays private to you. <button type="button" class="er-link js-noop">Privacy</button></p>
      </div>
    </div>
  </div>`;

// ---- Version B: one front door, two modes -------------------------------------------

const frontDoorB = () => {
  const isLogin = tab === "login";
  return `
    <div class="er-col">
      <div class="er-card l-stack l-stack--5">
        ${brand(
          "Walk into your next 1:1 well prepared.",
          isLogin ? "Log in to pick up where you left off." : "A private space for your company, in about a minute.",
        )}
        <div class="er-tabs" role="tablist" aria-label="Log in or create an account">
          <button type="button" class="er-tab js-tab" data-tab="login" role="tab"
            aria-selected="${isLogin}">Log in</button>
          <button type="button" class="er-tab js-tab" data-tab="register" role="tab"
            aria-selected="${!isLogin}">Create account</button>
        </div>
        <form class="l-stack js-form" data-form="${isLogin ? "login" : "register"}" novalidate>
          <p class="er-alert" data-alert hidden></p>
          ${isLogin ? loginFields() : registerFields()}
          <button type="submit" class="btn js-submit">${isLogin ? "Log in" : "Create account"}</button>
        </form>
        <p class="intake-or">or</p>
        ${googleButton()}
      </div>
      <div class="er-guest">
        <button type="button" class="btn btn--ghost js-noop">Prep a 1:1 free, no account needed</button>
        <p class="er-quiet">Nothing to fill in. What you type stays private to you.</p>
      </div>
    </div>`;
};

// ---- Chrome -------------------------------------------------------------------------

const seg = (label, group, options, current) => `
  <span class="er-seg-wrap">
    <span class="er-seg-label">${label}</span>
    <span class="er-seg" role="group" aria-label="${label}">
      ${options
        .map(
          ([value, text]) => `<button type="button" class="er-seg__btn js-switch" data-group="${group}"
            data-value="${value}" aria-pressed="${value === current}">${text}</button>`,
        )
        .join("")}
    </span>
  </span>`;

// ---- Render -------------------------------------------------------------------------

function screenHtml() {
  if (version === "b") return frontDoorB();
  if (screen === "register") return registerScreenA();
  if (screen === "front") return frontScreenA();
  return loginScreenA();
}

function render(host) {
  const narrow = width === "phone";
  host.innerHTML = `
    <style>${STYLE}</style>
    <div class="er-wrap">
      <div class="er-bar">
        ${seg("Version", "version", [["a", "A · matching set"], ["b", "B · one front door"]], version)}
        ${version === "a" ? seg("Screen", "screen", [["login", "Log in"], ["register", "Create account"], ["front", "Front door"]], screen) : ""}
        ${seg("Width", "width", [["desktop", "Desktop"], ["phone", "Phone"]], width)}
      </div>
      <p class="er-note">${NOTES[version]}</p>
      <div class="er-frame${narrow ? " er-frame--phone" : ""}">
        <div class="er-split${narrow ? " er-split--narrow" : ""}">
          <div class="er-split__form">${screenHtml()}</div>
          <div class="er-split__media" aria-hidden="true">
            <img class="er-split__img" src="${PHOTO}" alt="" onerror="this.remove()" />
          </div>
        </div>
      </div>
    </div>`;
  wire(host);
}

function wire(host) {
  // Prototype switches
  host.querySelectorAll(".js-switch").forEach((btn) =>
    btn.addEventListener("click", () => {
      const { group, value } = btn.dataset;
      if (group === "version") version = value;
      if (group === "screen") screen = value;
      if (group === "width") width = value;
      render(host);
    }),
  );

  // Version A: the mock's own links move between the three screens
  host.querySelectorAll(".js-go").forEach((btn) =>
    btn.addEventListener("click", () => {
      screen = btn.dataset.go;
      render(host);
    }),
  );

  // Version B: the two modes
  host.querySelectorAll(".js-tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      tab = btn.dataset.tab;
      render(host);
    }),
  );

  // Show / hide password — the toggle now sits INSIDE the field's right edge instead of
  // as a separate button beside it.
  host.querySelectorAll(".js-toggle-pw").forEach((btn) =>
    btn.addEventListener("click", () => {
      const input = btn.closest(".er-pw")?.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", String(show));
      btn.innerHTML = icon(show ? EyeOff : Eye, { size: 18 });
    }),
  );

  // Nothing here talks to a server. The mock submit demonstrates the error states:
  // empty fields fail inline under the field that is wrong; a filled form shows the
  // pending label, then the form-level alert with a next step.
  host.querySelectorAll(".js-form").forEach((form) => {
    const submit = form.querySelector(".js-submit");
    const alertEl = form.querySelector("[data-alert]");
    const clear = () => {
      alertEl.hidden = true;
      form.querySelectorAll(".er-err").forEach((e) => { e.hidden = true; e.textContent = ""; });
      form.querySelectorAll(".er-input").forEach((i) => i.setAttribute("aria-invalid", "false"));
    };
    const fail = (name, message) => {
      const input = form.querySelector(`[data-name="${name}"]`);
      const errEl = form.querySelector(`[data-err="${name}"]`);
      if (input) input.setAttribute("aria-invalid", "true");
      if (errEl) { errEl.textContent = message; errEl.hidden = false; }
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      clear();
      const value = (name) => (form.querySelector(`[data-name="${name}"]`)?.value || "").trim();
      const isRegister = form.dataset.form === "register";
      let ok = true;

      if (isRegister && !value("name")) { fail("name", "Tell us what to call you."); ok = false; }
      if (!value("email")) { fail("email", "Enter the email you use for work."); ok = false; }
      if (!value("password")) {
        fail("password", isRegister ? "Pick a password of at least 8 characters." : "Enter your password.");
        ok = false;
      } else if (isRegister && value("password").length < 8) {
        fail("password", "That is a bit short. Use at least 8 characters.");
        ok = false;
      }
      if (!ok) {
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }

      const label = submit.textContent;
      submit.disabled = true;
      submit.textContent = isRegister ? "Creating your account…" : "Logging in…";
      window.setTimeout(() => {
        submit.disabled = false;
        submit.textContent = label;
        alertEl.innerHTML = isRegister
          ? 'There is already an account on that email. <button type="button" class="er-link js-mock-login">Log in instead</button>, or use a different email.'
          : 'That email and password do not match. Try again, or <button type="button" class="er-link js-mock-reset">reset your password</button>.';
        alertEl.hidden = false;
        alertEl.querySelector(".js-mock-login")?.addEventListener("click", () => {
          if (version === "b") { tab = "login"; } else { screen = "login"; }
          render(host);
        });
      }, 600);
    });
  });

  // Mock affordances that lead nowhere in a prototype.
  host.querySelectorAll(".js-noop").forEach((btn) =>
    btn.addEventListener("click", (e) => e.preventDefault()),
  );
}

// Mounts into a host element provided by the /test gallery stage.
export function mount(root) {
  version = "a";
  screen = "login";
  tab = "login";
  width = "desktop";
  render(root);
}
