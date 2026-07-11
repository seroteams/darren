# Phase 2 — Reset UI (both apps)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
A "Forgot password?" link on the shared login, plus a request screen and a set-new-password screen, wired into both the admin and customer apps. One UI, no new CSS.

## Changes
- **New shared stages** under `admin/src/stages/`: `forgot-password.js` (email → `requestPasswordReset`) and `reset-password.js` (reads token from the URL, new password → `submitPasswordReset`, then redirects to login with a "password updated" message).
- **"Forgot password?" link** — a `.link` control in the shared login form (`admin/src/stages/login.js`), below the password field.
- **API client** — `shared/api.js`: add `requestPasswordReset({ email })` and `submitPasswordReset({ token, password })` (mirror the existing `postJson` calls).
- **STAGES** — add `FORGOT_PASSWORD` + `RESET_PASSWORD` to `admin/src/state.js`.
- **Routing + wiring (×2)** — `admin/src/router.js`, `admin/src/main.js`, `frontend/src/router.js`, `frontend/src/main.js`: `PATH_FOR`/`STAGE_FOR` for `/forgot-password` and `/reset-password/:token`, loader-map entries (frontend cross-imports from admin), and the logged-out boot allow-lists.

## Not in this phase
- Any backend change (all done in Phase 1).

## Done when
- [ ] Both apps: "Forgot password?" on login opens the request screen; submitting shows a "check your inbox" confirmation.
- [ ] Opening the emailed `/reset-password/:token` link shows the set-password screen; setting a valid password redirects to login with a success message and the new password works.
- [ ] Reused/expired links show a plain error on the screen.
- [ ] `npm run typecheck` clean; verified in the browser preview for admin AND customer.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Admin app, full loop** — from the admin login, click "Forgot password?", submit your email, open the email link, set a new password, then log in with it. You should land in the app. ❌ Not OK if any step dead-ends.
2. **Customer app, full loop** — same walk starting from the customer login. Should behave identically (it's the same screens). ❌ Not OK if the link bounces you to login instead of the reset screen.
3. **Bad link** — open a made-up `/reset-password/whatever` URL → a plain "this link isn't valid" message, no crash. ❌ Not OK if the page errors or lets you set a password.
