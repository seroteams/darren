# Phase 2 — Buttons on the screens

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built, awaiting Carl's QA

## Built (2026-07-25)
- `login.js` exports the shared `googleButtonHtml()`/`googleStartUrl()` snippet (ghost anchor + G asset, full-page navigation, `?app=admin|customer` by bundle); login shows friendly copy for every `?error=` code then tidies the URL. `register.js` imports the same snippet below the privacy line. `google-g.svg` in both public dirs; one `text-decoration:none` rule in auth.css.
- Contract tests extended FIRST in `auth-screens.test.ts` (5 new tests: snippet shape, both placements, error handling; all existing assertions untouched).
- Offline proof: npm test 186/186, typecheck admin+customer clean, lint:tokens + lint:copy clean.
- On-screen proof (Playwright, real dev servers): customer login + register, admin login (href carries `app=admin`), phone width 375px, and `/login?error=google-denied` renders "Google sign-in was cancelled." with the URL cleaned. Screenshots shared in chat 2026-07-25.

## Goal
"Continue with Google" appears on the login and create-account screens in both apps, matching the approved mockup, with friendly wording when something goes wrong.

## Changes
- `admin/src/stages/login.js` — shared Google button snippet (ghost button + the coloured G), an "or" hairline divider above it, and friendly on-screen messages for the `?error=` codes from Phase 1 (then the URL is tidied up). Serves both apps automatically.
- `admin/src/stages/register.js` — same button below the form.
- `admin/public/google-g.svg` + `frontend/public/google-g.svg` — the official Google G mark as a static asset (its colours live inside the file, so the token linter stays quiet).
- `admin/src/stages/auth-screens.test.ts` — contract tests extended first (button present on both screens, divider, error handling; existing assertions untouched).

## Not in this phase
- Invite-join page and welcome page (parked, Carl's call 2026-07-25).
- Anything live (Phase 3).

## Done when
- [ ] Matches the approved mockup; screenshots of the REAL rendered login + register screens taken before calling it done
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `lint:tokens`, `lint:copy` all green
- [ ] Carl has walked the scenarios and said go

## Test scenarios — for the product owner
Breadcrumb: `local > customer app (localhost:3002) > /login` and `local > admin app (localhost:3000/admin) > login`.

1. **The button is there** — open both login screens. Under Log in you see a hairline "or", then a white "Continue with Google" button with the coloured G. Blue stays only on Log in. ❌ Not OK if there are two blue buttons.
2. **It works** — click it, pick your Google account. You land logged in, same place as a password login.
3. **Create-account screen** — open Create one. The same Google button sits under the form; a brand-new Google account creates a company and lands on Home with the demo workspace.
4. **Friendly failure** — click the button and press Cancel on Google's screen. You are back on login with "Google sign-in was cancelled." in the normal error spot, and the address bar is clean.
5. **Nothing else moved** — password login, Forgot password and the guest "Try it free" line all behave exactly as before.
6. **Phone width** — narrow the window right down. The button fits the panel, nothing overlaps, text stays readable.
