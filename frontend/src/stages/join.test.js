import { test } from "node:test";
import assert from "node:assert/strict";
import { shellHtml, checkingHtml, deadInviteHtml, inviteHtml, orgInitial } from "./join.js";

// Join (design-consolidation Phase 2, audit A2 + A7): the invite landing wears the
// same auth costume as Log in — logo on top, an identity hero naming who invited
// you where, a card-framed form, a short what-you-see / what-stays-private list,
// and a persistent Log in path. The checking state stays neutral; a dead link gets
// its own plain-words screen.

const invite = { inviterName: "Maria", orgName: "Acme", email: "maria.team@acme.com", personName: "Jo" };

test("join shell: wears the auth split with the logo on top and a swappable panel", () => {
  const html = shellHtml({ logo: "/logo.png", photo: "/login/photo.jpg" });
  assert.ok(html.includes('class="auth-split'), "same split shell as login");
  assert.ok(html.includes("auth-panel"), "form column uses the shared panel");
  assert.ok(html.includes('class="auth-brand__logo" src="/logo.png"'), "Sero mark at the top");
  assert.ok(html.includes("js-panel"), "a host the states render into");
  assert.ok(html.includes("/login/photo.jpg"), "photo half passed through");
});

test("join checking state: neutral while the invite validates, no cheerful headline yet", () => {
  const html = checkingHtml();
  assert.ok(html.includes("Checking your invite…"), "quiet checking line");
  assert.ok(!html.includes("<h1"), "no committed h1 before validation");
  assert.ok(!html.includes("invited you"), "no premature invite copy");
});

test("join hero: inviter and org are the bold headline, not a dim sub-line", () => {
  const html = inviteHtml(invite);
  assert.ok(
    html.includes("<strong>Maria</strong> at <strong>Acme</strong> invited you"),
    "bold names in the hero line",
  );
  assert.ok(/<h1[^>]*class="[^"]*join-hero/.test(html), "the invite line IS the h1");
  assert.ok(html.includes('class="join-org-tile"'), "org identity tile present");
  assert.ok(html.includes(">A</div>"), "tile carries the org initial");
});

test("join hero: falls back gracefully when the invite has no inviter name", () => {
  const html = inviteHtml({ ...invite, inviterName: null });
  assert.ok(html.includes("You're invited to join <strong>Acme</strong>"));
});

test("join form: locked email, name prefill, password, one blue Join CTA", () => {
  const html = inviteHtml(invite);
  assert.ok(html.includes('value="maria.team@acme.com" disabled'), "email locked to the invite");
  assert.ok(html.includes('value="Jo"'), "name prefilled from the roster person");
  assert.ok(html.includes('type="password"'), "password field");
  const primary = html.match(/class="btn js-submit"/g) || [];
  assert.equal(primary.length, 1, "exactly one blue action");
  assert.ok(html.includes("Join Acme"), "CTA names the org");
  assert.ok(html.includes("card-flat"), "form is card-framed");
  assert.ok(html.includes("eyebrow eyebrow--slot"), "quiet slot-tier labels, same as register");
  assert.ok(!html.includes('class="eyebrow"'), "no accent-blue section-tier labels in the form");
  assert.ok(html.includes("js-toggle-pw"), "show/hide password toggle, same as the other auth forms");
});

test("join reassurance: compact what-you-see / what-stays-private rows + Privacy link", () => {
  const html = inviteHtml(invite);
  assert.ok(html.includes("What you'll see"), "seeing row");
  assert.ok(html.includes("What stays private"), "privacy row");
  assert.ok(html.includes("join-facts"), "rendered as the compact list, not a dim paragraph");
  assert.ok(html.includes("js-to-privacy"), "Privacy link near the form");
  assert.ok(html.includes("never shown to you here"), "mirrors the member About promise");
});

test("join footer: persistent Already have an account? Log in", () => {
  const html = inviteHtml(invite);
  assert.ok(html.includes("Already have an account?"));
  assert.ok(html.includes("js-to-login"), "Log in path wired");
});

test("join dead state: expired headline, fresh-invite ask, quiet Log in path", () => {
  const html = deadInviteHtml("This invite link is incomplete. Ask your manager for a fresh invite.");
  assert.ok(html.includes("This invite link has expired"), "distinct headline");
  assert.ok(html.includes("fresh invite"), "tells them the way back in");
  assert.ok(html.includes("js-to-login"), "Log in path");
  assert.ok(!html.includes('class="btn js-submit"'), "no blue action on a dead link");
});

test("join: interpolated invite fields are HTML-escaped", () => {
  const html = inviteHtml({ inviterName: "<img>", orgName: 'A"cme<b>', email: "a@b.co", personName: "<i>" });
  assert.ok(!html.includes("<img>"), "inviter escaped");
  assert.ok(!html.includes("<b>"), "org escaped");
  assert.ok(!html.includes("<i>"), "person escaped");
});

test("join: org initial for the identity tile", () => {
  assert.equal(orgInitial("acme"), "A");
  assert.equal(orgInitial("  Zebra Corp"), "Z");
  assert.equal(orgInitial(""), "S");
});

test("join: no em dashes and no exclamation marks in any state", () => {
  const all = [
    shellHtml({ logo: "/logo.png", photo: "" }),
    checkingHtml(),
    inviteHtml(invite),
    deadInviteHtml("Ask your manager for a fresh invite."),
  ].join("");
  assert.ok(!all.includes("—"), "no em dashes"); // lint-copy-ignore: the assertion must name the banned character to prove its absence
  assert.ok(!all.includes("!"), "no exclamation marks");
});
