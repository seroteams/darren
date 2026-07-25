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

test("register: the phantom auth-card class and page-header are gone", () => {
  assert.ok(!REGISTER.includes("auth-card"), "no undefined auth-card class");
  assert.ok(!REGISTER.includes("page-header"), "page-header is not for auth pages");
});

test("register: quiet signpost line routes a lost invitee", () => {
  assert.ok(
    REGISTER.includes("Joining an existing team? Use the invite link your manager sent you."),
    "signpost copy",
  );
});

test("register: privacy-agreement line sits directly beneath the submit button", () => {
  const submitAt = REGISTER.indexOf('js-submit">Create account</button>');
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
    assert.ok(src.includes('class="field__label"'), `${name}: standard field label in use`);
  }
});

test("login: Forgot password sits on the password label row, right-aligned", () => {
  assert.ok(
    /l-row l-row--between[\s\S]{0,250}Password[\s\S]{0,250}js-to-forgot/.test(LOGIN),
    "forgot link inside the password label row",
  );
  const matches = LOGIN.match(/js-to-forgot/g) || [];
  assert.equal(matches.length, 2, "one markup slot + one listener, no second footer link");
});

test("login: footer collapses to one account line plus the guest line, centred as a group", () => {
  assert.ok(LOGIN.includes("No account?"), "single account line");
  assert.ok(LOGIN.includes(">Create one</button>"), "create link kept");
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
  assert.ok(LOGIN.includes("btn btn--ghost btn--sm js-toggle-pw"), "small ghost icon-button");
  assert.ok(LOGIN.includes('aria-pressed="false"'), "pressed-state button");
  assert.ok(LOGIN.includes('aria-label="Show password"'), "labelled for screen readers");
});

test("login, register, reset: every password field carries the shared toggle", () => {
  for (const [name, src] of Object.entries({ LOGIN, REGISTER, RESET })) {
    assert.ok(src.includes("passwordToggleHtml"), `${name}: toggle markup in the field`);
    assert.ok(src.includes("wirePasswordToggles"), `${name}: toggle wired`);
    assert.ok(src.includes("js-pw-wrap"), `${name}: input + toggle share a row`);
    // The toggle floats over the field's right end (.field-pw), so the input's
    // underline stays the same width as every other field.
    assert.ok(src.includes("field-pw js-pw-wrap"), `${name}: toggle overlays, never shortens the line`);
  }
});

// --- A4: forgot confirmation gets a Resend button ----------------------------

test("forgot: confirmation offers a Resend email ghost button, keeps non-enumeration copy", () => {
  assert.ok(FORGOT.includes(">Resend email</button>"), "resend button");
  assert.ok(/btn btn--ghost js-resend/.test(FORGOT), "quiet ghost treatment");
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
    /js-submit">Log in<\/button>[\s\S]{0,220}intake-or[\s\S]{0,120}\$\{googleButtonHtml\(\)\}/.test(LOGIN),
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
