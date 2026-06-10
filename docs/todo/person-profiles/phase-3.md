# Phase 3 — People list page in the app

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
A "People" tab next to Library: everyone Sero has met, with run counts and last-seen dates.

## Changes
- **New `frontend/client/src/stages/people.js`** — list view cloned from `stages/library.js`: name, run count, last run date, profile badge. Clicking a row navigates to the person page (lands in Phase 4 — until then the row can be non-clickable or link nowhere gracefully).
- **Edit `frontend/client/src/api.js`** — `getPeople()`.
- **Edit `frontend/client/src/state.js`** — `PEOPLE` stage.
- **Edit `frontend/client/src/router.js`** — `/people`.
- **Edit `frontend/client/src/main.js`** — loader entry for the new stage.
- **Edit `frontend/client/src/ui/app-nav.js`** — "People" link beside Library.

## Not in this phase
- The person detail page (Phase 4)
- Model-written synthesis (Phase 5)

## Done when
- [ ] People tab reachable from the nav and by URL
- [ ] Nothing else in the app changed
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **The tab** — open the app. You should see "People" in the nav next to Library. Click it: everyone listed with run counts and last-run dates.
2. **Deep link** — go straight to `/people` and refresh the page. The list should still be there.
3. **Nothing broke** — click through Library and a normal run start. Everything behaves as before.
