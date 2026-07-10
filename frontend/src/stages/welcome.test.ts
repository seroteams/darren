import { test } from "node:test";
import assert from "node:assert/strict";
import { welcomeHtml } from "./welcome.ts";

// The guest-first start screen (start-screen): the copy is fixed by the spec —
// UK English, no exclamation marks, exactly one button (the guest CTA), and the
// privacy promise sits directly above it. Everything else is a text link.

const html = welcomeHtml("/login/photo.jpg");

test("welcome: carries the exact agreed copy", () => {
  assert.ok(html.includes("Walk into your next 1:1 well prepared."), "H1");
  assert.ok(
    html.includes(
      "Sero turns your rough notes into a focused prep brief and sharper questions for your next 1:1. It takes about two minutes.",
    ),
    "body copy",
  );
  assert.ok(
    html.includes(
      "What you type stays private to you. Nothing is shared with your team or your company.",
    ),
    "privacy line",
  );
  assert.ok(html.includes("Try it — no account needed"), "guest CTA label");
  assert.ok(!html.includes("!"), "no exclamation marks anywhere");
});

test("welcome: the guest CTA is the only button — the rest are text links", () => {
  const buttons = html.match(/class="btn[" ]/g) || [];
  assert.equal(buttons.length, 1, "exactly one primary button");
  for (const label of ["Log in", "Create an account", "Privacy"]) {
    assert.ok(html.includes(`>${label}<`), `${label} link present`);
  }
});

test("welcome: privacy promise sits directly above the CTA", () => {
  const privacyAt = html.indexOf("What you type stays private");
  const ctaAt = html.indexOf("Try it — no account needed");
  assert.ok(privacyAt > -1 && ctaAt > -1 && privacyAt < ctaAt);
});

test("welcome: keeps the split layout with the given photo", () => {
  assert.ok(html.includes('class="auth-split"'), "same split layout as login");
  assert.ok(html.includes("/login/photo.jpg"), "photo passed through");
});
