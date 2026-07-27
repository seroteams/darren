# Phase 2 — build Version A into the real screens

**Status:** 🔨 BUILT 2026-07-27, awaiting Carl. Not walked by him yet.

## What it did

Version A came out of the prototype and into the real screens. Login and register are one
shared set of files, so one edit serves both apps.

Tests first: `admin/src/stages/auth-screens.test.ts` asserted on literal source strings that
described the old markup. Those assertions were rewritten to the new contract before a screen
changed, so the suite stayed the thing that proves it.

| Screen | File | What changed |
|---|---|---|
| Log in | `admin/src/stages/login.js` | On a card. Compact boxed fields with the show/hide toggle inset. Each field owns its own error message. One alert that ends with "Or reset your password", wired to the forgot screen. Footer: "New to Sero? Create an account" then the free path as a quiet line |
| Create account | `admin/src/stages/register.js` | Same recipe, five fields (name, company, sector, email, password). Per-field errors including the short-password and unknown-sector cases. The alert offers "Log in instead", but only when the failure really is a taken email |
| Front door | `frontend/src/stages/welcome.ts` | Same card and one grouped footer. Copy and button hierarchy untouched (fixed by its own contract test) |
| Auth CSS | `admin/src/styles/design/auth.css` | `.auth-card`, `.auth-field` / `.auth-input` / `.auth-pw`, `.auth-err`, `.auth-alert`, and a real `.link` rule scoped to `.auth-split` |

The shared field kit (`authField`, `authPasswordField`, `authFormErrors`) is exported from
`login.js`, next to `passwordToggleHtml` and `googleButtonHtml`, so register reaches it rather
than repeating it.

`.input` in `buttons-inputs.css` was NOT touched: the prep flow depends on the big session
field, so the boxed variant is a new class scoped to these screens. A test asserts both halves
of that.

**Off the plan, done anyway:** the register conflict message from the server carried an em
dash ("That email already has an account — log in instead."), which the house rule bans and
which this screen renders verbatim. It is now "That email already has an account.", with
"Log in instead" as the alert's real link. `npm run lint:copy` never caught it because the
guard only scans `admin/src` and `frontend/src`; backend user-facing strings are unguarded.

## Verified

- `npm test` 198/198 (was 196/197 mid-build, three old assertions rewritten), `npm run typecheck`,
  `lint:copy`, `lint:tokens`, `lint:components` all green.
- On the real rendered customer app (`localhost:3385`), measured rather than claimed:
  card 12px radius / 24px padding / surface on tint; boxed input 4px radius, 1px border all
  round, 16px; **zero** big session `.input` left on either screen; one `or` divider; `.link`
  now computes to the accent blue at weight 600 instead of grey; the heading renders in
  Bricolage.
- Error behaviour exercised for real: empty submit marks both fields, writes "Enter the email
  you use for work." / "Enter your password.", focuses the first; a wrong password shows the
  coral alert whose "reset your password" link really lands on `/forgot-password`.
- Phone (375px): photo drops away, card 295px, no sideways scroll, smallest text on screen 14px.

## NOT verified

- **No screenshot.** The Browser pane was not displayed this session and the Playwright
  instance was held by another chat, so there is no picture of the finished screens. Everything
  above is measured off the live DOM, which is stronger for those specific claims and weaker
  for "does it look right".
- A real end-to-end login and a real registration were not run (the alert path was exercised
  with a deliberately wrong password against the live API).
- Google sign-in was not clicked through.

## QA for Carl

`local > customer app (logged out) > /login`

1. Press "Log in" with both fields empty: each field says what it needs, under itself.
2. Log in with the wrong password: one coral alert, ending in a "reset your password" link.
3. Log in properly: lands where it did before.
4. Go to Create account, then the front door: all three wear the same card.
5. Narrow the window to phone width: the photo drops, nothing scrolls sideways.
