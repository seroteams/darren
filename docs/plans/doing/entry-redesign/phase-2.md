# Phase 2 — build Version A into the real screens

**Status:** ⛔ blocked. Not started.

## Blocked on

`LANES.md` row `0d52559f` (google sign-in) holds `admin/src/stages/login.js`,
`admin/src/stages/register.js` and `admin/src/stages/auth-screens.test.ts`. That chat's Phase 3 is
deployed but not finished: Carl still has to enter `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in
the Render dashboard and do his live walk. Editing through another chat's lane is not allowed, so
this phase waits for that row to clear.

## What it does when it starts

Take Version A out of the prototype and into the real screens, in both apps (login and register are
one shared set of files, so one edit serves admin and customer).

Tests first: `admin/src/stages/auth-screens.test.ts` asserts on literal source strings that
describe today's markup (`auth-split`, `field__label`, no `auth-card`, `intake-or` immediately
before `js-try-guest`, the `js-submit` → `intake-or` → Google order). Those assertions get rewritten
to the new contract before a screen changes, so the suite stays the thing that proves it.

The change, per screen:

| Screen | File | Change |
|---|---|---|
| Log in | `admin/src/stages/login.js` | Form onto a card, compact boxed fields, show/hide inside the field, field-level errors plus one alert with a next step, one `or` divider, grouped footer (Create an account, then the free path as a quiet line) |
| Create account | `admin/src/stages/register.js` | The same recipe, four fields tightened |
| Front door | `frontend/src/stages/welcome.ts` | Same card and footer shape, guest CTA stays its one blue action |
| Auth CSS | `admin/src/styles/design/auth.css` | The card, the boxed field variant, a real link style, the display family on the heading |

Do NOT change `.input` in `buttons-inputs.css`: the prep flow depends on the big session field. The
boxed variant is a new class, scoped to the auth screens.

## QA when built

`local > customer app (log out first) > /login`, then `/register`, then `/`

1. Log in with the wrong password: the alert says what to do next, and the field that is wrong is
   marked.
2. Log in properly: lands where it did before, for both a manager and an internal admin.
3. Create an account end to end, including the Google button and the invite signpost.
4. The front door's free CTA still starts a guest run.
5. Phone width on all three, nothing scrolls sideways.
6. `npm test`, `npm run typecheck`, `npm run lint:copy`, `npm run lint:tokens` all green.
