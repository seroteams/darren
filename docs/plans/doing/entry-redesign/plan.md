# Entry redesign — the way in (log in / create account / start free)

**Status:** Phase 1 ✅ GREEN-LIT 2026-07-25. **Carl picked Version A (matching set).** Phase 2 is
blocked: the `google-signin` lane still holds `login.js` / `register.js` / `auth-screens.test.ts`.
**Owner lane:** `c62009ae` (see LANES.md).
**Board:** https://claude.ai/code/artifact/616f323d-8678-4122-ac21-78af9b370f55

## Current state

Phase 1 landed as a Test-area prototype (`/admin/test` → "The way in. Two versions"), both versions
walkable, live screens untouched. Carl walked it and chose **A**: keep the three screens and the
three routes, dressed to match. Version B (one front door with tabs) is recorded here but not
being built.

Verified before sign-off: typecheck, 186/186 tests, `lint:copy`, `lint:tokens`, and 9 headless
screenshots of every state (both versions, three screens, phone width, empty-field errors, wrong
password alert). No console errors.

**Next:** Phase 2 builds Version A into the real screens, tests first, in both apps. It cannot
start until the google-signin chat releases the login files (see preconditions below).

## Goal

The way into Sero (log in, create account, and the free no-account door) looks unfinished and
gives a visitor four competing choices. Redesign the three as one coherent set, prove it in the
Test area first, then swap the live screens once Carl picks a version.

**Done means:** Carl has walked a prototype of both versions, picked one, and the winner is live
on the real screens in both apps with the contract tests updated.

## Why it needs doing (measured against DESIGN.md, not taste)

| # | Problem | Where |
|---|---|---|
| 1 | The fields use the **big session input** (`.input`, 20-28px, bottom rule only). DESIGN.md §5 reserves that for the session flow; forms get the compact boxed input. Biggest single cause of the odd look. Register wears four of them. | `admin/src/styles/design/buttons-inputs.css:56` |
| 2 | **Four ways in with no pecking order:** Log in, Continue with Google, Create one, Try it free. | `admin/src/stages/login.js:110-120` |
| 3 | **Two stacked divider rules**, and the second is not an "or": a link is wearing `.intake-or` divider furniture. | `admin/src/stages/login.js:111,118` |
| 4 | **No card.** The form floats on the page tint. | `admin/src/styles/design/auth.css:21` |
| 5 | **One shared error line above the button**, so it never says which field is wrong or what to do next. | `admin/src/stages/login.js:109` |
| 6 | **`.link` has no CSS anywhere in the repo**, so "Create one" and "Try it free" render as plain grey text, not links. | grep `\.link\b` across all CSS: no match |
| 7 | **`.auth-brand__title` never applies `--type-family-display`**, so "Welcome back" renders in Inter, not Bricolage. | `admin/src/styles/design/auth.css:43` |
| 8 | Login **duplicates the front door's job** (the guest CTA is the front door's one blue action and also a link at the bottom of login). | `frontend/src/stages/welcome.ts:30` |

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | Prototype both versions in the Test area (`/test`), nothing live touched | ✅ GREEN-LIT 2026-07-25 (Carl picked A) |
| 2 | Build **Version A** for real in `login.js` / `register.js` / `welcome.ts`, tests first | ⛔ Blocked on the google-signin lane |

## Phase 2 preconditions (do not start without these)

- ✅ Carl has picked a version: **A**.
- The `google-signin` lane (`0d52559f`) has released `admin/src/stages/login.js`,
  `register.js` and `auth-screens.test.ts`.
- `admin/src/stages/auth-screens.test.ts` asserts on literal source strings (`auth-split`,
  `field__label`, `intake-or` before `js-try-guest`, no `auth-card`, the
  `js-submit` → `intake-or` → Google order, and more). Those assertions describe today's
  markup, so Phase 2 rewrites the test contract first, then the screens.

## The two versions

**A · Matching set.** Today's three screens and routes, dressed to match: one white card on the
page tint, compact boxed fields, one blue action, one `or` divider, a single grouped footer, and
field-level errors. Lowest risk, no routing change.

**B · One front door.** One screen replaces login + register + welcome. Log in and Create account
are two tabs on the same card; the free no-account path is a persistent quiet ghost under the card.
Removes the screen-to-screen bouncing and keeps the free path always visible. Touches routing.

## QA (Phase 1)

`local > admin (dev login: Admin) > /admin/test > "The way in. Two versions"`

1. Version A: walk Log in → Create account → Front door using the switch and the in-mock links.
2. Press "Log in" with the fields empty: each field says what it needs, in plain words.
3. Fill both and press "Log in": the pending label shows, then one alert with a next step.
4. Switch Width to Phone: the photo drops away, the card fills the width, nothing scrolls sideways.
5. Version B: switch the tabs, check the free-entry block stays put under the card.
