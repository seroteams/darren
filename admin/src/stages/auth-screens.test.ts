import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// The four shared auth stages build their markup inside mount() (which touches
// import.meta.env), so this guard reads the source instead of importing —
// same approach as runs.test.ts / briefing-structure.test.ts. It locks the
// design-consolidation Phase 2 shape (audit items A1, A3, A4): one .auth-split
// brand shell on every auth screen, standard sentence-case field labels, the forgot
// link on the password row, show/hide password toggles, a Resend button on the
// forgot confirmation, and one fixed photo instead of a random pick per visit.

const here = dirname(fileURLToPath(import.meta.url));
const read = (name: string) => readFileSync(join(here, name), "utf8");

const LOGIN = read("login.js");
const REGISTER = read("register.js");
const FORGOT = read("forgot-password.js");
const RESET = read("reset-password.js");
const ALL = { LOGIN, REGISTER, FORGOT, RESET };
// entry-redesign Phase 2 puts the way in on a card with boxed fields, so the
// contract also checks the CSS actually defines what the markup asks for — the
// bug that started this plan was `.link` used everywhere and styled nowhere.
const AUTH_CSS = readFileSync(join(here, "../styles/design/auth.css"), "utf8");
const ENTRY = { LOGIN, REGISTER };

// --- A1: register wears the same brand shell as login ------------------------

test("register: wears the .auth-split shell (logo, title, sub, photo half)", () => {
  assert.ok(REGISTER.includes('class="auth-split"'), "split shell");
  assert.ok(REGISTER.includes("auth-brand__logo"), "logo");
  assert.ok(REGISTER.includes("Create your account"), "title kept");
  assert.ok(REGISTER.includes("auth-brand__sub"), "sub line");
  assert.ok(REGISTER.includes("auth-split__media"), "photo half");
  assert.ok(REGISTER.includes('root.classList.add("stage--auth")'), "full-bleed stage");
  assert.ok(/unmount\(root\)[\s\S]{0,120}stage--auth/.test(REGISTER), "unmount removes stage class");
});

test("register: no page-header, and auth-card is now a real defined class", () => {
  assert.ok(!REGISTER.includes("page-header"), "page-header is not for auth pages");
  // It used to be a phantom: the markup wore `auth-card` and no CSS defined it.
  // entry-redesign Phase 2 brings the card back with a rule behind it.
  assert.ok(/^\.auth-card \{/m.test(AUTH_CSS), "auth-card is defined in auth.css");
});

test("register: quiet signpost line routes a lost invitee", () => {
  assert.ok(
    REGISTER.includes("Joining an existing team? Use the invite link your manager sent you."),
    "signpost copy",
  );
});

test("register: privacy-agreement line sits directly beneath the submit button", () => {
  // The markup comes from ui/button.ts now (component-consolidation P3), so the anchors
  // are the button() call's options rather than a hand-typed tag.
  const submitAt = REGISTER.indexOf('label: "Create account"');
  const privacyAt = REGISTER.indexOf("By creating an account");
  const loginLinkAt = REGISTER.indexOf("Already have an account?");
  assert.ok(submitAt > -1 && privacyAt > -1 && loginLinkAt > -1, "all three present");
  assert.ok(privacyAt > submitAt, "privacy line after the submit button");
  assert.ok(privacyAt < loginLinkAt, "privacy line before the footer link");
});

// --- A3: quiet labels, forgot on the password row, one footer line -----------

test("all four: field labels use the standard sentence-case label, not caps eyebrows (audit A4)", () => {
  for (const [name, src] of Object.entries(ALL)) {
    assert.ok(!src.includes("eyebrow"), `${name}: no small-caps eyebrow labels`);
  }
  // Login owns the label markup for the two entry screens now (the shared field
  // kit), so register reaches it through the kit rather than repeating it.
  assert.ok(LOGIN.includes('class="field__label"'), "LOGIN: standard field label in use");
  assert.ok(REGISTER.includes("authField({ label:"), "REGISTER: labels via the shared kit");
  for (const [name, src] of Object.entries({ FORGOT, RESET })) {
    assert.ok(src.includes('class="field__label"'), `${name}: standard field label in use`);
  }
});

test("login: Forgot password sits on the password label row, right-aligned", () => {
  // The label row is now the boxed field's own top row (.auth-field__top), not a
  // generic l-row: the field owns its label, its aside and its error slot. The
  // forgot link rides in as that field's `aside`, which the kit puts on the row.
  assert.ok(
    /auth-field__top[\s\S]{0,200}field__label[\s\S]{0,120}\$\{aside\}/.test(LOGIN),
    "the kit renders an aside on the label row",
  );
  assert.ok(
    /authPasswordField\(\{[\s\S]{0,160}aside:[\s\S]{0,120}js-to-forgot/.test(LOGIN),
    "login passes Forgot password as the password field's aside",
  );
  const matches = LOGIN.match(/js-to-forgot/g) || [];
  assert.equal(matches.length, 2, "one markup slot + one listener, no second footer link");
});

// --- A5: a field's accessible name is its label, and nothing else ------------
// A <label> wrapping its control also folds every button inside it into the
// control's accessible name. Login's password box was announced as "Password
// Forgot password? Show password". Wrapping stays a plain element and the label
// text points at the input by id, so the name is just the label again.

/** The buttons an auth field can carry, literal or via a helper call. */
const BUTTON_SOURCES = ["<button", "passwordToggleHtml()", "${aside}"];

/** Every `<label ...>` block in a source file, crudely but sufficiently sliced. */
function labelBlocks(src: string): string[] {
  return src.split(/<label\b/).slice(1).map((rest) => rest.split("</label>")[0]);
}

test("auth fields: no <label> wraps a button, so the name is the label alone", () => {
  for (const [name, src] of Object.entries(ALL)) {
    for (const block of labelBlocks(src)) {
      for (const button of BUTTON_SOURCES) {
        assert.ok(
          !block.includes(button),
          `${name}: a <label> contains ${button}, which would land in the field's accessible name`,
        );
      }
    }
  }
});

test("auth fields: the kit ties label to input by id, not by wrapping", () => {
  assert.ok(/<div class="auth-field">/.test(LOGIN), "the field wrapper is a plain div");
  assert.ok(!/<label class="auth-field">/.test(LOGIN), "the field wrapper is never a label");
  const forAttrs = LOGIN.match(/<label class="field__label" for="\$\{hook\}"/g) || [];
  assert.equal(forAttrs.length, 2, "both kit fields label by for=, one text and one password");
  const ids = LOGIN.match(/<input id="\$\{hook\}"/g) || [];
  assert.equal(ids.length, 2, "both kit inputs carry the matching id");
  assert.ok(/<label class="field__label" for="reset-password"/.test(RESET), "reset labels by for=");
  assert.ok(/<input id="reset-password"/.test(RESET), "reset input carries the id");
});

test("login: footer collapses to one account line plus the guest line, centred as a group", () => {
  assert.ok(LOGIN.includes("New to Sero?"), "single account line");
  assert.ok(LOGIN.includes(">Create an account</button>"), "create link kept");
  assert.ok(!LOGIN.includes("No account yet?"), "old ladder copy gone");
  assert.ok(!LOGIN.includes("Just curious?"), "old guest paragraph gone");
  assert.ok(
    /auth-panel__foot[\s\S]{0,400}js-try-guest/.test(LOGIN),
    "both quiet lines sit in the one centred footer group",
  );
  assert.ok(
    !/intake-or[\s\S]{0,200}js-try-guest/.test(LOGIN),
    "the guest line no longer wears the hairline divider (mixed alignment)",
  );
});

// --- A3: show/hide password toggles ------------------------------------------

test("the toggle is defined once in login.js: Lucide Eye/EyeOff, ghost icon-button, pressed state", () => {
  assert.ok(/import \{[^}]*Eye[^}]*EyeOff[^}]*\} from "lucide"/.test(LOGIN), "Lucide Eye/EyeOff");
  assert.ok(LOGIN.includes('from "../ui/icon.js"'), "renders through ui/icon.js");
  // The markup now comes from ui/button.ts (component-consolidation P3), so the guard is
  // on the options it is called with rather than on a hand-typed class string.
  assert.match(LOGIN, /variant: "ghost"[\s\S]{0,60}size: "sm"[\s\S]{0,60}hook: "js-toggle-pw"/, "small ghost icon-button");
  assert.match(LOGIN, /"aria-pressed": "false"/, "pressed-state button");
  assert.match(LOGIN, /ariaLabel: "Show password"/, "labelled for screen readers");
});

test("login, register, reset: every password field carries the shared toggle", () => {
  for (const [name, src] of Object.entries({ LOGIN, REGISTER, RESET })) {
    assert.ok(src.includes("wirePasswordToggles"), `${name}: toggle wired`);
  }
  // Login and register get the markup through the shared field kit; reset still
  // builds its own field, so it names the pieces itself.
  for (const [name, src] of Object.entries({ LOGIN, RESET })) {
    assert.ok(src.includes("passwordToggleHtml"), `${name}: toggle markup in the field`);
    assert.ok(src.includes("js-pw-wrap"), `${name}: input + toggle share a row`);
  }
  // The toggle always overlays the field rather than sitting beside it, so the
  // input never comes up short of the others. Two wrappers, one per field shape:
  // the boxed entry field insets it, the underlined session field floats it over
  // the line's right end.
  assert.ok(LOGIN.includes("authPasswordField"), "login: boxed field, toggle inset");
  assert.ok(REGISTER.includes("authPasswordField"), "register: same shared field");
  assert.ok(/\.auth-pw \.js-toggle-pw \{/.test(AUTH_CSS), "boxed wrapper insets the toggle");
  assert.ok(RESET.includes("field-pw js-pw-wrap"), "reset keeps the underlined session field");
});

// --- entry-redesign Phase 2: Version A on the real screens -------------------
// Carl walked both prototypes on 2026-07-25 and picked A (matching set): the
// same three screens and routes, dressed to match. What that means, tested:
// a card, compact boxed fields, one blue action, one divider, field-level
// errors, one alert that carries a next step, and links that are actually styled.

test("entry: log in and create account both sit on the card", () => {
  for (const [name, src] of Object.entries(ENTRY)) {
    assert.ok(src.includes('class="auth-card'), `${name}: form on a card`);
  }
});

test("entry: the fields are the compact boxed variant, never the big session input", () => {
  for (const [name, src] of Object.entries(ENTRY)) {
    assert.ok(!/class="input /.test(src), `${name}: no big session .input on a form`);
    assert.ok(src.includes("authField") || src.includes("authPasswordField"), `${name}: boxed field kit`);
  }
  assert.ok(/^\.auth-input \{/m.test(AUTH_CSS), "the boxed field is defined");
  // DESIGN.md §5 reserves the borderless clamp field for the session flow, so the
  // prep flow's .input must survive this change untouched.
  const INPUTS = readFileSync(join(here, "../styles/design/buttons-inputs.css"), "utf8");
  assert.ok(/^\.input \{/m.test(INPUTS), "the session field is left alone");
});

test("entry: the shared field kit gives every field its own error slot", () => {
  assert.ok(LOGIN.includes("export function authField"), "field helper shared from login.js");
  assert.ok(LOGIN.includes("export function authPasswordField"), "password variant shared too");
  assert.ok(LOGIN.includes('class="auth-err"'), "a per-field message slot");
  assert.ok(LOGIN.includes('aria-invalid="false"'), "fields start valid and are marked when not");
  assert.ok(/^\.auth-err \{/m.test(AUTH_CSS), "the field message is styled");
  assert.ok(REGISTER.includes("authField"), "register uses the same kit, not its own copy");
});

test("entry: a failed attempt names the field AND the alert carries a next step", () => {
  // Login was one shared red line above the button that never said which field
  // was wrong or what to do about it (plan problem 5).
  assert.ok(LOGIN.includes("Enter your password."), "login: per-field message");
  assert.ok(LOGIN.includes("Enter the email you use for work."), "login: per-field message");
  assert.ok(/js-alert-forgot[\s\S]{0,200}reset your password/.test(LOGIN), "login alert offers the reset");
  assert.ok(REGISTER.includes("Tell us what to call you."), "register: per-field message");
  assert.ok(/js-alert-login[\s\S]{0,200}Log in instead/.test(REGISTER), "register alert offers log in");
  assert.ok(/^\.auth-alert \{/m.test(AUTH_CSS), "the alert is styled, not a bare red line");
});

test("entry: .link finally has a rule behind it, scoped to the auth shell", () => {
  // Plan problem 6: `.link` was used on every way-in screen and defined in no
  // stylesheet, so "Create an account" and "Try it free" rendered as grey text.
  assert.ok(/^\.auth-split \.link \{/m.test(AUTH_CSS), "styled under the auth shell");
  assert.ok(/\.auth-split \.link:focus-visible/.test(AUTH_CSS), "and keyboard-focusable");
});

// --- A4: forgot confirmation gets a Resend button ----------------------------

test("forgot: confirmation offers a Resend email ghost button, keeps non-enumeration copy", () => {
  assert.ok(FORGOT.includes('label: "Resend email"'), "resend button");
  assert.match(FORGOT, /variant: "ghost"[\s\S]{0,40}hook: "js-resend"/, "quiet ghost treatment");
  assert.ok(FORGOT.includes("has a Sero account, we've sent a reset link"), "non-enumeration copy kept");
  assert.ok(!FORGOT.includes("try again in a minute"), "old prose gone");
  assert.ok(/js-resend[\s\S]{0,400}requestPasswordReset\(\{ email \}\)/.test(FORGOT), "re-submits the same email");
});

// --- A4/A1: one fixed photo, chosen deterministically ------------------------

test("all four: the photo is the first pool entry, never a random pick", () => {
  for (const [name, src] of Object.entries(ALL)) {
    assert.ok(src.includes("LOGIN_PHOTOS[0]"), `${name}: fixed first photo`);
    assert.ok(!src.includes("Math.random"), `${name}: no per-visit randomness`);
  }
});

// --- google-signin Phase 2: Continue with Google ------------------------------

test("google button: defined once in login.js as a ghost anchor with the G mark", () => {
  assert.ok(LOGIN.includes("export function googleButtonHtml"), "snippet exported from login.js");
  assert.ok(LOGIN.includes("export function googleStartUrl"), "start URL helper exported");
  assert.ok(/btn btn--ghost js-google/.test(LOGIN), "ghost treatment: blue stays on the primary action");
  assert.ok(LOGIN.includes("google-g.svg"), "the coloured G rides as a static asset");
  assert.ok(LOGIN.includes(">Continue with Google</a>"), "an anchor: a full-page navigation, not a fetch");
  assert.ok(LOGIN.includes('aria-hidden="true"'), "decorative mark hidden from screen readers");
  assert.ok(LOGIN.includes("/api/v1/auth/google/start?app="), "points at the server's start route");
});

test("login: the google button sits behind an or divider, after the submit button", () => {
  assert.ok(
    /label: "Log in"[\s\S]{0,220}intake-or[\s\S]{0,160}\$\{googleButtonHtml\(\)\}/.test(LOGIN),
    "Log in, then the hairline or, then Continue with Google",
  );
});

test("register: the google button rides the same shared snippet, after privacy, before the footer", () => {
  assert.ok(REGISTER.includes("googleButtonHtml"), "shared snippet imported, not duplicated");
  const privacyAt = REGISTER.indexOf("By creating an account");
  const googleAt = REGISTER.indexOf("${googleButtonHtml()}");
  const loginLinkAt = REGISTER.indexOf("Already have an account?");
  assert.ok(privacyAt > -1 && googleAt > -1 && loginLinkAt > -1, "all three present");
  assert.ok(googleAt > privacyAt, "google after the privacy line");
  assert.ok(googleAt < loginLinkAt, "google before the footer link");
});

test("login: a failed Google round-trip shows friendly copy and tidies the URL", () => {
  assert.ok(LOGIN.includes("URLSearchParams"), "reads the ?error= code");
  assert.ok(LOGIN.includes("history.replaceState"), "cleans the URL after showing the message");
  assert.ok(LOGIN.includes("Google sign-in was cancelled."), "cancel copy");
  assert.ok(LOGIN.includes("Google sign-in didn't finish. Please try again."), "fallback copy");
  assert.ok(LOGIN.includes("Google sign-in isn't set up yet."), "unconfigured copy");
});
