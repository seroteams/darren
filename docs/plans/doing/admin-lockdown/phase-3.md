# Phase 3 — Fix the signposts

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
No login, register, email, or in-app link ever points a manager or member at `/admin` — every signpost sends each role to its right front door.

## Changes
- Sweep every place a URL is handed to a user (dependency-check ritual): `admin/src/ui/login.js`, `register.js`, `landing.ts`, invite emails, password-reset emails, any hardcoded `/admin` links in either app or backend email templates.
- Non-super-admin logins on the admin app's own login screen → full redirect to the customer app at `/`.
- Invite + reset emails: confirm they already point at `/` (the customer app) — fix any that don't.
- Tests first for any changed routing logic; the register→login path verified for real (not via autologin, which is a false proxy).

## Not in this phase
- Slimming the admin bundle (parked).

## Done when
- [ ] Grep + dependency-check sweep documented in this file: every user-facing URL source listed, each verified pointing at the right app.
- [ ] A manager logging in at `/admin/login` ends up on the customer app at `/` (real walk, screenshotted).
- [ ] A fresh invite email's link opens the customer app join page.
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. This closes the plan.
1. **Manager login lands at the right door** — `local > go to /admin/login > sign in as manager@seroteams.com`. You should end up on the normal app home at `/`, not anywhere under `/admin`. ❌ Not OK if the address bar still says /admin anything.
2. **Invite email points home** — send yourself a fresh member invite from Team; open the link in the email. It opens the normal app's join page. ❌ Not OK if the link contains /admin.
3. **Super-admin unaffected** — log in at `/admin/login` as your super-admin account: you land on Pulse as usual.
