# Phase 4 — Global sweep + admin core screens

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done — green-lit by Carl 2026-07-05 ("commit, its good")

> Build notes (2026-07-05): landed — `select` joined the 16px base font rule (iOS zoom);
> phone-only ≥16px bump for any input/select/textarea; User management / Error log table
> first column pinned (sticky, solid bg) over sideways scroll; comfortable tap heights on
> small buttons under `(pointer: coarse)`; Session popover clamped to the viewport
> (session-topbar.js); `pre` blocks scroll inside themselves; long unbroken strings
> (errors, routes, emails, Guide commands) wrap. Found + fixed in the walk: **/guide had a
> real 27px page overflow** — long command strings drove the reference grid past the
> viewport. Verified live at 375: Start, Library, Tasks, Guide all zero overflow; sticky
> column pinned while scrolling (injected-markup test — User management itself is
> superadmin-only, your walk); popover fully on-screen; real inputs ≥16px. Skipped by
> design: fade-edge on the table (the pinned column already signals more content — kept
> simple); admin-registered.ts untouched (another session is mid-build on deactivate there).
> The joblex/guide-ref width caps from the original scope were already handled by existing
> media queries.

## Goal
App-wide phone papercuts fixed (iOS zoom, off-screen menus, tiny tap targets, overflow), and the core admin screens — Start, Library, Tasks, Review run, User management — get proper mobile layouts.

## Changes
- `admin/src/styles/design.css`:
  - Add `select` to the 16px base font rule (stops iOS zooming on every dropdown); mobile-only bump to 16px for controls kept at 14px desktop density.
  - `min()`-cap fixed widths (joblex layout, guide ref); `overflow-wrap: anywhere` on content blocks; `pre`/img max-widths. (The modal cap already landed in Phase 3 — the glossary needed it.)
  - `(pointer: coarse)`: comfortable min-heights on small buttons (`btn--sm`, row `⋯` menus).
  - User management table: keep sideways scroll but pin the first column (`position: sticky`, solid background) + a fade edge so it's obvious there's more.
  - Start / Library / Tasks / Review-run: filters and action rows wrap; card grids collapse; verify review-run's existing 860px stack.
- `admin/src/ui/session-topbar.js` — clamp the Session popover to the viewport (~5 lines).
- `admin/src/stages/admin-registered.ts` — class hooks only if needed.

## Not in this phase
- Compare/Regression/Personas/lexicons/arcs/Guide/Universe (Phase 5).

## Done when
- [ ] No screen in the app shows page-level sideways scroll at 375px.
- [ ] Focusing any input/select on iOS does not zoom the page.
- [ ] Free checks green: `npm test`, `npm run typecheck:admin`, admin build.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **User management on the phone** — open User management. The table scrolls sideways with the User column pinned; the `⋯` menu opens fully on-screen and role change works with a finger.
2. **No zoom jumps** — tap into a few inputs and dropdowns around the app (intake form, a select somewhere). The page must not zoom in when you tap them. ❌ Not OK if it zooms.
3. **Library + Tasks** — both usable at phone width: filters wrap, cards stack, nothing cut off.
4. **Review a run** — open a past run's review page; sections stack and read cleanly.
5. **Session menu** — mid-run, open the Session menu near the screen edge. The popover stays fully on-screen.
