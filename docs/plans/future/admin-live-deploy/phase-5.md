# Phase 5 — Runs explorer (the "view ALL runs" sub-page) + honest guest tile

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every data point on Pulse has somewhere to go: a cross-company Runs page listing EVERY live run — filter by meeting type, finished/stopped, manager, date — each row opening the Phase-4 run detail. And the guest tile's "became a signup" line becomes real data instead of a guess.

## Changes
- New superadmin read: `GET /api/v1/admin/runs` — every session (all companies, finished AND unfinished), newest first, with person, manager, meeting type, status/stage, rating, verdict. Filter params: `type`, `status`, `userId`, `since`. Paged (simple `limit`/`offset`) so a busy alpha doesn't ship megabytes.
- New `admin/src/stages/admin-runs.ts` at `/admin/runs-all` (SUPERADMIN_ONLY): the one-table runs explorer with filter chips; rows open the Phase-4 run detail. Pulse wires to it: "Runs this week" tile → this page; drop-off card → this page pre-filtered to stopped runs.
- **Guest claim marker**: migration adds `sessions.claimed_at` + `claimed_by`; the claim path (sessions.service `claim`) stamps them. Guest tile then honestly reports "N unclaimed · M became signups"; the guest screen shows claimed-by. (Backfill: existing claimed runs are unknowable — they show as ordinary owned runs; stated, not hidden.)

## Not in this phase
- Charts/cohorts on the runs page — it's a filterable table, nothing more.
- Editing/deleting runs from the explorer — read-only.

## Done when
- [ ] Service tests: filters (type/status/user/since) + paging + the claim stamp.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **All runs** — from Pulse, tap "Runs this week". You land on the Runs page showing every live run with type, status, rating, verdict. ❌ Not OK if unfinished runs are missing.
2. **Filter** — filter to "Feels-off" type: only those runs remain. Filter to "stopped": you see where each one broke off.
3. **Into the detail** — tap any row: the Phase-4 run detail (answers + feedback) opens.
4. **Guest honesty** — after a NEW guest run is claimed on live, the guest tile's "became a signup" count goes up by one. Old claims from before this phase aren't counted (that's stated on the screen, not hidden).
