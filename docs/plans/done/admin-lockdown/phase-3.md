# Phase 3 — Fix the signposts

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-20 — Carl signed off on the evidence (emails already root-safe; login/register eject added, 164/164)

## Built (2026-07-20)

### The sweep — every place a URL is handed to a user (dependency-check)
| Signpost | Where | Points at | Verdict |
|---|---|---|---|
| Invite email link | `invites.controller.ts:49-51`, `members.controller.ts:48-94` | `${base}/join/<token>` — `base` is proto+host only (no path) | ✅ root app, already safe |
| Password-reset email link | `auth.controller.ts:136-137` | `${base}/reset-password/<token>` | ✅ root app, already safe |
| Email logo/chrome | `email-layout.ts:10` | `APP_BASE_URL` or `sero-obwq.onrender.com` root | ✅ root app |
| `landingStage` resolver | `landing.ts:15-17` | returns a STAGE, not a URL — per-app | ✅ correct per bundle |
| Admin-app login seating | `login.js` | was: `landingStage` (seats manager in admin shell) | **fixed** → eject to `/` |
| Admin-app register seating | `register.js` | was: `landingStage` (a self-signup is always a manager) | **fixed** → eject to `/` |

No `/admin` link is ever emailed or handed to a user. The emails were already root-based (the token flow was never at risk of breaking on the Phase 1 lock).

### The one change
- `admin/src/stages/login.js` + `register.js`: after a successful sign-in, a non-internal user in the **admin bundle** (`import.meta.env.BASE_URL` starts `/admin`) is navigated to `/` instead of being seated on an admin-app stage. Guarded by the build base so the **shared customer bundle** (`/`) is untouched (a manager still lands on customer START there).
- This is belt-and-braces behind Phase 1: in prod the server already 302s a non-internal `/admin` load, so a manager can't even reach the admin login screen — this makes the intent explicit at the source and gives dev the same result.

- **Proof:** `npm test` 164/164, `npm run typecheck` clean. Email safety proven by the URL construction above + the existing `notifications.service.test.ts` (asserts root `sero.app/join` + `/reset-password` links). The login/register eject cannot fire on the prod build (Phase 1 blocks the admin login screen for anonymous), so it is verified by code + suite, not a live click — stated honestly.

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
