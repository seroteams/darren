# Start screen — move login off the front door

**Goal:** A fresh visitor on `/` sees a guest-first start screen — what Sero does, the privacy
promise, one button into a guest run. The login form moves to `/login` (unchanged). Invited
testers get from the link to a guest run in one click.
**Driver:** Carl · **Created:** 2026-07-05 · **Rides on:** [guest-run](../guest-run/PLAN.md) Phase 2 (the guest lane this front door feeds).

## Done means
- Logged out on `/`: the start screen, no login form, no nav rail.
- One click ("Try it — no account needed") lands on the first intake question.
- `/login` still renders the existing form — dev logins and the "Try it" link untouched.
- Logged in on `/`: your normal home (manager start page / member Past 1:1s), never the start screen.
- Log in · Create an account · Privacy links all resolve (the real privacy page already existed — no stub needed).
- On a 375px phone the CTA is above the fold and the photo drops away.

## Decisions
- **Admin app only for now.** The guest lane (guest-run Phase 2) exists only in the admin app
  (:3000) — that's the app testers use. The customer app (:3002) keeps its login front door
  until the guest lane is ported there (parked below).
- The manager home keeps the `/` URL when logged in; boot decides which screen `/` shows.
  New stage `WELCOME` (`admin/src/stages/welcome.ts`), same auth split layout + photo pool as login.
- Guest entry logic now lives once in `admin/src/guest.ts` — the start screen and the login
  screen's "Try it" link both call it (no duplicated session logic).

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | The whole slice | `WELCOME` stage + copy · `/` routing for logged-out boot, back/forward, unknown paths · login untouched at `/login` · rail hidden on the start screen | 🔨 built 2026-07-05, awaiting Carl's walk |

## Current state
**BUILT + verified 2026-07-05 — awaiting Carl's walk.** Test-first (copy contract, single-button
rule, root-path mapping, guest-entry helper — red→green): `npm test` **78/78** (was 76) ·
`npm run typecheck:admin` clean. Browser-proven on a scratch Vite (:3009, $0, fresh profile):
logged-out `/` → start screen (no form, no rail) → CTA → intake at `/new` → back returns to the
start screen; `/login` intact incl. the Manager/Admin/Member dev cycle; register + privacy links
resolve; 375px CTA above the fold (bottom 488px of 667), photo dropped; signed in as the dev
manager → `/` is the manager home again. No engine/API/contract changes.
⚠️ Commit note: a parallel session's checkpoint swept this build into `3bf7f2d3`
("feat(admin): guest + welcome stages…") together with other tracks' in-flight admin files —
same co-mingle hazard as before; the message declares both.

## Test scenarios — for the product owner (all free)
1. **The new front door** — in a logged-out/private window, open `/`. You see "Walk into your
   next 1:1 prepared." with ONE blue button — no login form, no side rail. ❌ Not OK if the
   login form or any nav shows.
2. **One click in** — press "Try it — no account needed". You land on "Who are you prepping
   for?" (`/new`). Stop there (starting a run is guest-run Phase 3's paid walk).
3. **Login still lives** — open `/login` directly: the old form, your dev logins, and its own
   "Try it" link, all as before.
4. **Links row** — from `/`, try Log in · Create an account · Privacy — each opens the right page.
5. **You never see it logged in** — log in, then open `/`: your normal start page, not this screen.
6. **Phone** — narrow the window to phone width (or open on your phone): the button is visible
   without scrolling, the photo is gone.

## Parked
- Port the front door + guest lane to the customer app (`frontend/`, :3002) when that app goes live to testers.
- Observed during QA (pre-existing, guest-run Phase 2 territory): as a **guest** on intake, the
  nav rail shows member rows ("Past 1:1s", "Log out"). Worth a look in the guest-run walk —
  phase-2.md scenario 3 expects no rail for guests.
