# Phase 2 — Lists and tables

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every list and table screen ghosts as its own list or table, not as generic grey cards.

## Changes
- Add the `table` and `timeline` presets to `admin/src/ui/skeleton-presets.ts` (`list-rows` already exists).
- Swap `loadingHtml(n)` for a preset at ~14 call sites: `admin/src/stages/runs.ts`, `library.js`, `personas.js`, `admin-registered.ts`, `admin-runs.ts`, `admin-ratings.ts`, `admin-gate1.ts`, `admin-guest-runs.ts`, `start-core.js`, and `frontend/src/stages/team.ts`, `members.ts`, `member-home.js`.
- Add a "Loading states" block to the existing `states` section of `admin/src/stages/design.js` so the presets can be tuned side by side.
- Extend the parity table in `skeleton-presets.test.ts` for every newly borrowed class.

## Blocked on
`admin/src/stages/runs.ts` is claimed by chat `d03316aa`. Needs that lane clear.

## Not in this phase
Detail screens, KPI tiles, two-column rails, the run lane, forms.

## Done when
- [ ] Ghost row count, row height and column widths match the loaded table on each screen
- [ ] Shape holds under Slow 3G throttling
- [ ] Parity tests cover every borrowed class; `npm test` green
- [ ] Carl has walked the scenarios below and said go

## Test scenarios — for the product owner
Breadcrumb: `local > admin (dev autologin) > Past 1:1s, then Library, then Registered`
1. **A list loads as a list.** Open Past 1:1s on a throttled connection. While it loads you should see ghost rows with a round avatar, a name line and a shorter line under it. When the real list arrives, nothing should move. ❌ Not OK if the page jumps or resizes.
2. **A table loads as a table.** Open Library. You should see ghost table rows with the right number of columns, not a stack of cards. ❌ Not OK if you see cards.
3. **Row counts feel right.** The ghost should show roughly as many rows as the real screen usually has. ❌ Not OK if you see 3 ghosts then 20 real rows.
