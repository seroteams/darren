# Phase 4 — History compounds & returns count

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every 1:1 deepens the per-person record, and the Gate-1 question — "did a manager come back unprompted?" — becomes answerable from data you already hold.

## Changes
- **Step zero — test what's already true (M10):** `intake.js` on this branch already carries `personId` and its comments claim free-typed names create roster people, but no server-side create/match code was found in the sweep. Run one live intake with a new name FIRST; if the person appears on Team, M10 shrinks to the orphan backfill below.
- **Intake people join Team (M10):** a person named free-text in intake is created in (or matched to) the Team roster, so their runs and their card share one record. Existing orphaned run-people (e.g. Maya, Nikki on the seeded account) get matched or surfaced.
- **Return events (X4):** server-side only — record login, 1:1 started, 1:1 finished per manager (timestamps + ids in the existing Postgres). No UI, no emails, no nudges — measuring must not contaminate the validation metric. *Ships as migration 0018 — migrations auto-run on server boot (server.ts:140), so live picks it up on the next deploy with no manual DB step. Event writes must tolerate the dev-autologin lane (non-uuid ids fail PG inserts — known pitfall): skip silently on invalid ids, and verify dev-lane behaviour via the API, not a DB query.*
- **A free report script (X4/X6):** `node scripts/report-returns.mjs` prints a plain table per manager — days active, 1:1s started/finished, gaps between visits, median minutes from intake start to briefing (X6's time-per-prep comes free from the same timestamps).

## Not in this phase
- Any dashboards/UI for the metrics (parked — script only). Any nudge or reminder (banned during validation).

## Done when
- [ ] Prepping a 1:1 for a brand-new name puts that person on Team with the run attached (verify the Team page AND the DB row, not the routing).
- [ ] The events table gains rows for login/start/finish when the flow is exercised.
- [ ] `report-returns.mjs` prints correct numbers for the seeded manager's real history.
- [ ] `npm test` + `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **The roster promise holds** — start a new 1:1 for a made-up name ("Test Tomas"), cancel after step 1 or complete it, then open Team. Tomas should be there, with the 1:1 attached to his card if you completed it. ❌ Not OK if Tomas only exists in Home's list.
2. **Old orphans are found** — open Team on the seeded account: Maya Chen and Nikki (who have runs but no card today) should now appear, or be listed for you to confirm/merge. ❌ Not OK if runs still reference people Team doesn't know.
3. **Returns are visible** — after a day of normal use, run `node scripts/report-returns.mjs` (I'll run it for you if you prefer). You should see your logins and 1:1s with dates, and a minutes-per-prep figure. ❌ Not OK if numbers are obviously wrong (e.g. zero after you just ran one).
4. **Nothing nudges** — confirm no new emails, banners, or reminders appeared anywhere. Measuring only.
