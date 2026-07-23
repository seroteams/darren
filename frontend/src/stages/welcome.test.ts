import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { welcomeHtml } from "./welcome.ts";

// The guest-first start screen (start-screen): the copy is fixed by the spec —
// UK English, no exclamation marks. The guest CTA is the one blue action;
// Create account is the single ghost beside it, and Log in is a quiet text
// link on the page's top row (design-consolidation Phase 2, audit A4).

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

test("welcome: Log in is a quiet text link on the top row, not a mid-page ghost", () => {
  assert.ok(/class="link js-to-login"/.test(html), "log in rendered as a quiet .link");
  assert.ok(!/btn[^"]*js-to-login/.test(html), "no ghost-button log in");
  const loginAt = html.indexOf("js-to-login");
  const h1At = html.indexOf("Walk into your next 1:1");
  assert.ok(loginAt > -1 && h1At > -1 && loginAt < h1At, "log in row sits above the headline");
  assert.ok(
    /l-row--end[\s\S]{0,200}js-to-login/.test(html),
    "log in row is right-aligned",
  );
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

test("welcome: always shows the same fixed photo, never a random pick", () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "welcome.ts"),
    "utf8",
  );
  assert.ok(src.includes("LOGIN_PHOTOS[0]"), "first pool entry, deterministically");
  assert.ok(!src.includes("Math.random"), "no per-visit randomness");
});
