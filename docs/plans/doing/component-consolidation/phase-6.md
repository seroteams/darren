# Phase 6 — Page header and screen scaffold adoption

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal

Use the shared pieces that already exist. No new code in this phase.

`pageHeader()` was built and is used by 5 screens. Meanwhile 33 screens type their own `<h1>` with four different spacing variants. `loadingHtml()` and `errorCardHtml()` were built too, and 5 stages still hand-roll their own.

## Changes

- Adopt `admin/src/ui/page-header.ts` across the 33 raw `<h1 class="h1">` sites, normalising the four spacing variants (`h1`, `h1 mb-2`, `h1 mb-4`, `h1 js-title`) to one.
- Adopt `loadingHtml` / `errorCardHtml` from `admin/src/ui/screen-scaffold.ts` in the 5 non-adopters: `admin-runs.ts`, `run-detail.ts`, `person-detail.ts`, `guided/guided.page.ts`, `member-home.js`.

## Not in this phase

- Changing any page title's words.
- Touching the flow screens that deliberately have no page header (the session runner).

## Done when

- [ ] Raw `<h1 class="h1">` count down to recorded exemptions.
- [ ] All 5 stages use the shared loading and error card.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:copy` clean.
- [ ] Screenshots of three headers side by side attached.
- [ ] Carl has tested the scenarios below and said go.

## Test scenarios — for the product owner

`local > admin (email + password) > Runs`

1. **Header spacing** — Runs, Team, Library, Admin > Users. The gap between the page title and the content below it is the same on all four. ❌ Not OK if one is noticeably tighter.
2. **Titles unchanged** — every page still says exactly what it said before.
3. **Breadcrumbs** — on a screen that has them (Run detail), they still sit above the title and still work when clicked.
4. **Loading** — hard-refresh Admin > Runs. You see the standard grey ghost cards, the same ones you see elsewhere. ❌ Not OK if you see a plain "Loading..." sentence anywhere.
5. **Error** — stop the server, refresh. The "Couldn't load" card looks the same on Admin > Runs as it does on Team.
