# Phase 4 — Person detail page

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Click a person → read their profile in the app, rebuild it with a button, and jump into any of their past runs.

## Changes
- **New `frontend/client/src/stages/person.js`** — rendered profile + "Rebuild" button + their run list; each run's "Review" jumps to the existing run-review page.
- **Edit `frontend/client/src/api.js`** — `getPerson(slug)`, `rebuildProfile(slug)`.
- **Edit `frontend/client/src/state.js`** — `PERSON` stage + `personSlug`.
- **Edit `frontend/client/src/router.js`** — `/people/:slug` (parsed like `/run/:id`).
- **Edit `frontend/client/src/main.js`** — back/forward handling mirroring the run-review page.
- **Edit `frontend/client/src/stages/people.js`** — wire row clicks to the person page.

**Rendering note:** the client has no markdown library — render the profile with a tiny in-file, escape-first transform of our own fixed skeleton (headings, table, lists). No new dependency.

## Not in this phase
- Model-written synthesis (Phase 5)

## Done when
- [ ] Person page readable, rebuildable, linked both ways
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Maya's page** — from the People tab, click Maya. You should see her profile rendered readably plus her run list. ❌ Not OK if it shows raw markdown symbols everywhere or looks broken.
2. **Into a run and back** — click "Review" on one of her runs. You land on the normal run page; Back returns to her profile.
3. **Deep link** — go straight to `/people/maya` and refresh. Still there.
4. **Rebuild button** — click Rebuild. The "rebuilt at" time updates.
5. **Thin person** — open someone with only 1 run (e.g. Priya). The page shows cleanly with the "not enough yet" note, no errors.
