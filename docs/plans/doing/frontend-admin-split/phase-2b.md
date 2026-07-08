# Phase 2b — Catch the customer app up

**Part of:** [PLAN.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-08
Carl walked the 5 scenarios and green-lit ("A"). Build + proof detail below.

## 🔨 BUILT 2026-07-08 ($0)
All four gaps closed by mirroring admin's logic into `frontend/src/{main.js, router.js, ui/app-nav.js}`
— no admin files touched, no new behaviour invented. Proven live on :3002 in the preview browser:
logged-out `/` → welcome screen (rail hidden) · `/join/test123` → join screen with the honest
invalid-token message · guest "Try it" → intake at `/new`, survives F5 · member dev-login → rail is
just "Past 1:1s", reload lands `/runs`, `/new` bounces to `/runs` · manager unchanged (Home, full
rail, `/universe` still bounces). Free checks: `npm test` 96/96 · typecheck clean ·
`npm run build:customer` ✓. Zero console errors.
**Observed seam (admin has it too, mirrored not fixed):** login.js lands a member on Member Home
(`/home`, "Welcome to Sero") but every later visit lands `/runs` — the same happens on :3000, so the
two apps match; flag for a later tidy if wanted.

## Why this phase exists
The customer app was built 2026-07-05 as a snapshot of the admin app's customer surface — and the
admin app kept moving. Scoping Phase 3 (2026-07-08) found four customer-facing behaviours that landed
in admin **after** the snapshot, so they exist on :3000 but not :3002. Carl picked option A: a small
catch-up phase first, walked, then Phase 3 slims admin. Without this, Phase 4 would publish a customer
app with no guest front door and dead invite links.

## The four gaps (customer app vs today's product truth)
| # | Gap | Landed in admin | Customer app today |
|---|-----|----------------|--------------------|
| 1 | **WELCOME** — guest-first front door at `/` for logged-out visitors (start-screen track) | 2026-07-06 | Logged-out → login form |
| 2 | **JOIN** — `/join/:token` member invite links (member-onboarding) | 2026-07-06/07 | Unknown path → login |
| 3 | **Guest lane** — logged-out visitor takes a run; mid-run reload resumes it | 2026-07-05/06 | Reload mid-run kicks a guest to login (run lost from view) |
| 4 | **Member view = only-runs** — members see just Past 1:1s, can't start a 1:1 (`99f826dd`) | 2026-07-05 22:09 (before the snapshot commit but not in it) | Members still get Home · Team · prep flow |

## Changes (mirror admin's customer-surface logic — no new behaviour invented)
- `frontend/src/router.js` — add WELCOME + JOIN paths and `/join/:token` parsing; add the guest
  lane set (`isGuestStage`); shrink `MEMBER_ONLY` to Runs + Run detail; drop the now-redundant
  `MANAGER_ONLY` set (the member bounce covers it, same as admin).
- `frontend/src/main.js` — add WELCOME + JOIN loaders; mirror admin's popstate guards (guest lane,
  member→Past 1:1s bounce, JOIN token, flow-stage fallback to WELCOME for guests) and admin's boot
  (logged-out: intake/guest-rehydrate/join/welcome; member: only-runs, land on `/runs`).
- `frontend/src/ui/app-nav.js` — member rail becomes the single "Past 1:1s" row; hide the rail on
  WELCOME and for guests mid-run (F-004), same conditions as admin.

## Not in this phase
- Slimming the admin app (Phase 3). No admin file changes at all.
- Fixing anything that's also true of admin today (e.g. the rail shows on a logged-out /join page
  in both apps — if that's a bug it's admin's too; mirroring keeps them identical).

## Done when
- [x] Logged-out on :3002 → the guest-first welcome screen at `/`; "Try it" starts a guest run;
      a mid-run reload returns the guest to their run.
- [x] A `/join/:token` link renders the join screen logged-out.
- [x] A member logs in → lands on Past 1:1s; no Home/Team rows; can't reach `/new` or the flow.
- [x] Manager experience unchanged (Home · New 1:1 · Team · Past 1:1s, prep flow works).
- [x] Free checks: `npm test` + typecheck clean · `npm run build:customer` ✓ · admin build untouched.
- [x] Product owner has tested the scenarios below and said go. (Green-lit 2026-07-08.)

## Test scenarios — for the product owner (all free, ~3 min)
1. **Guest front door** — open http://localhost:3002 logged out (private window). You get the
   "Walk into your next 1:1 prepared" welcome screen, not a login form. ❌ Not OK if login shows.
2. **Guest run survives reload** — click "Try it — no account needed", answer the first intake
   question, press F5. You're back in your run, not on login. ❌ Not OK if the run is gone.
3. **Join link** — open http://localhost:3002/join/test123 logged out. The join screen renders
   (an invalid-token message is fine — the screen existing is the point). ❌ Not OK on login/welcome.
4. **Member view** — dev-login as Member. You land on Past 1:1s; the rail has no Home/Team; typing
   `/new` in the URL bounces you back. ❌ Not OK if a member can start a 1:1.
5. **Manager unchanged** — dev-login as Manager. Everything as you walked in Phase 2. ❌ Not OK
   if anything moved.
