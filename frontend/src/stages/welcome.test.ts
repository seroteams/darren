import { test } from "node:test";
import assert from "node:assert/strict";
import { welcomeHtml } from "./welcome.ts";

// The guest-first start screen (start-screen): the copy is fixed by the spec —
// UK English, no exclamation marks. The guest CTA is the one blue action; Log in
// and Create account sit beside it as quieter ghost buttons. Version 3 copy
// (problem-led), chosen 2026-07-20.

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

test("welcome: the guest CTA is the one blue action; Log in / Create account are ghost buttons", () => {
  const primary = html.match(/class="btn js-try-guest"/g) || [];
  assert.equal(primary.length, 1, "exactly one primary (blue) button. The guest CTA");
  const ghosts = html.match(/class="btn btn--ghost/g) || [];
  assert.equal(ghosts.length, 2, "Log in + Create account are ghost buttons");
  for (const label of ["Log in", "Create account", "Privacy"]) {
    assert.ok(html.includes(`>${label}<`), `${label} present`);
  }
});

test("welcome: the guest CTA comes before the alt-auth buttons", () => {
  const ctaAt = html.indexOf("Prep my 1:1 free, no account");
  const loginAt = html.indexOf(">Log in<");
  assert.ok(ctaAt > -1 && loginAt > -1 && ctaAt < loginAt);
});

test("welcome: keeps the split layout with the given photo", () => {
  assert.ok(html.includes('class="auth-split'), "same split layout as login");
  assert.ok(html.includes("/login/photo.jpg"), "photo passed through");
});
