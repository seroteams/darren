# Phase 2 — Label + remove

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Everything demo is unmistakably labelled "Example" and can be cleared with one click.

## Changes
- "Example" pill (tinted badge per DESIGN.md §5, ≥14px) on: the Home run card (`admin/src/stages/start-core.js`), the Team roster card (`frontend/src/stages/team-card.ts`), the person-detail header and the run recap header, driven by the `is_demo` flag surfaced through the runs/people APIs.
- "Remove example" action on person detail (and Team card `⋯` menu): routes through the shared confirm dialog, deletes the demo person + demo sessions + artifacts for that org, returns the screens to their normal empty states.
- Copy in plain words, no em dashes; `npm run lint:copy` + `lint:tokens` clean.

## Not in this phase
- Auto-hide when the first real member is added (parked).
- Any change to how real people/runs render.

## Done when
- [ ] Fresh signup shows the Example badge on Home, Team and person detail (screenshot of the real rendered screens, not code).
- [ ] "Remove example" (after confirm) leaves zero demo rows in the DB and the normal empty states back on screen.
- [ ] `npm test`, `npm run typecheck`, `npm run lint:copy`, `npm run lint:tokens` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Badges** — `local > frontend app > register a brand-new account`. On Home, the example 1:1 carries an "Example" pill; same on Team and when you click into the person. ❌ Not OK if any demo surface is unlabelled.
2. **Remove** — on the example person, click "Remove example", confirm. You should land back on the normal first-time empty screens with the example gone everywhere (Home, Team). ❌ Not OK if any trace remains or a real-data screen changed.
3. **Real data safe** — add a real member, then remove the example. The real member is untouched.
