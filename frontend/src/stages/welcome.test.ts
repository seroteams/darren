import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { welcomeHtml } from "./welcome.ts";

// The guest-first start screen (start-screen): the copy is fixed by the spec —
// UK English, no exclamation marks. The guest CTA is the one blue action;
// Create account is the single ghost beside it, and Log in is a quiet text
// link in the footer row below the buttons (Carl, 2026-07-25).

const html = welcomeHtml("/login/photo.jpg");

test("welcome: carries the exact agreed copy", () => {
  assert.ok(html.includes("Walk into your next 1:1 well prepared."), "H1");
  assert.ok(
    html.includes(
      "Type a few rough notes. Sero turns them into a clear brief and sharper questions, in about two minutes.",
    ),
    "body copy",
  );
  assert.ok(
    html.includes("What you type stays private to you."),
    "privacy line",
  );
  assert.ok(html.includes("Prep my 1:1 free, no account"), "guest CTA label");
  assert.ok(!html.includes("!"), "no exclamation marks anywhere");
});

test("welcome: the guest CTA is the one blue action; Create account is the single ghost", () => {
  const primary = html.match(/class="btn js-try-guest"/g) || [];
  assert.equal(primary.length, 1, "exactly one primary (blue) button. The guest CTA");
  const ghosts = html.match(/class="btn btn--ghost/g) || [];
  assert.equal(ghosts.length, 1, "Create account is the only ghost button");
  assert.ok(html.includes(">Create account<"), "Create account present");
  assert.ok(html.includes(">Privacy<"), "Privacy link present");
});

test("welcome: Log in is a quiet text link below the buttons, not a mid-page ghost", () => {
  assert.ok(/class="link js-to-login"/.test(html), "log in rendered as a quiet .link");
  assert.ok(!/btn[^"]*js-to-login/.test(html), "no ghost-button log in");
  const loginAt = html.indexOf("js-to-login");
  const createAt = html.indexOf(">Create account<");
  const privacyAt = html.indexOf("js-to-privacy");
  assert.ok(loginAt > -1 && createAt > -1, "both present");
  assert.ok(createAt < loginAt, "log in line sits below the Create account ghost");
  assert.ok(loginAt < privacyAt, "log in line sits above the privacy line");
});

test("welcome: the guest CTA comes before the Create account ghost", () => {
  const ctaAt = html.indexOf("Prep my 1:1 free, no account");
  const createAt = html.indexOf(">Create account<");
  assert.ok(ctaAt > -1 && createAt > -1 && ctaAt < createAt);
});

test("welcome: keeps the split layout with the given photo", () => {
  assert.ok(html.includes('class="auth-split'), "same split layout as login");
  assert.ok(html.includes("/login/photo.jpg"), "photo passed through");
});

test("welcome: wears the same card and grouped footer as log in (entry-redesign P2)", () => {
  // Carl picked Version A: three screens, one shape. The front door is one of
  // the three, so it takes the card and the one centred footer group too.
  assert.ok(html.includes('class="auth-card'), "the card the whole entry set wears");
  assert.ok(html.includes("auth-panel__foot"), "log in + privacy read as one footer");
});

test("welcome: always shows the same fixed photo, never a random pick", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "welcome.ts"),
    "utf8",
  );
  assert.ok(src.includes("LOGIN_PHOTOS[0]"), "first pool entry, deterministically");
  assert.ok(!src.includes("Math.random"), "no per-visit randomness");
});
