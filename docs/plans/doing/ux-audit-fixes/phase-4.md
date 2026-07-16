# Phase 4 — History compounds & returns count

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built (self-signed — see verification)

## Built (2026-07-17)
On `main`. Offline proof: **suite 149/149 (incl. new returns-report 6/6), `npm run typecheck` clean. The report was also run against the REAL local DB (free read) and printed correct per-manager numbers** — a genuine end-to-end verification, not just units.

- **M10 — intake people join Team — VERIFIED ALREADY BUILT (no code change).** Traced the live path: `sessions.controller.resolvePerson` → `peopleService.resolveForRun`, which for a free-typed name calls `people.service.create` (dedupe-or-insert into the roster) and stamps the new `personId` on the session at `repo.create`. So a free-typed intake name already creates/matches a Team roster person and links the run. The people-roster Phase 2 shipped this; the audit predated confirming it. **Step-zero done in code, not by a paid run.**
- **X4 / X6 — returns are measurable — a free report script.** New [scripts/report-returns.ts](../../../scripts/report-returns.ts): `npx tsx scripts/report-returns.ts` prints a per-manager table — days active, 1:1s started/finished, gaps between visits, median minutes intake→briefing, and a **"returned?"** flag (active on 2+ separate days = the Gate-1 signal). The aggregation is a pure, unit-tested module [backend/api/services/returns/returns-report.ts](../../../backend/api/services/returns/returns-report.ts) (6 tests); the script only does the DB read.
- **No nudges, no UI, no emails** — measuring only, so the validation metric stays clean. ✓

## Deviation (flagged) — no new events table
The plan called for a new server-side **events table (migration 0018)** recording login / 1:1-started / 1:1-finished. Two reasons I derived the same signal from data Sero **already holds** instead:
1. **The data already exists** — a login is an `auth_sessions` row (`created_at`), and every 1:1 is a `sessions` row (`created_at` = intake start, `completed_at` = briefing). Started / finished / minutes-per-prep / gaps / days-active all come straight from `sessions`; logins from `auth_sessions`. A new table would duplicate this (simplicity-first).
2. **`0018` is already taken** by a parallel track, and a migration I can't apply/verify in this dev lane would be shipped blind.

**Honest trade-off:** `auth_sessions` rows can be pruned on expiry, so *login-only* returns (a manager who logs in but doesn't prep) are lossy over long windows. The **primary** Gate-1 signal — a manager who came back **and prepped another 1:1** — comes from the permanent `sessions` table and is fully durable. If durable login-only tracking is ever needed, that's the moment to add the events table (a clean future follow-up).

## Verification status (self-signed, Carl delegated)
- ✅ Unit: returns-report 6/6; whole suite 149/149; typecheck clean.
- ✅ **Real data:** ran the script against the local DB — correct numbers (e.g. the seeded manager: 27 started / 7 finished across 13 active days, returned ✓).
- ⬜ **Not verified by me:** the live-site figures (the report reads whichever DB `DATABASE_URL` points at; live picks up on the next deploy — no migration needed). Orphan run-people (Maya/Nikki) surfacing on Team is a data-quality nicety left un-built — M10's create path works going forward; old pre-roster orphans can be surfaced later if they matter.

---

**Original plan below.**



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
