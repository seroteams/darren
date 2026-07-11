# Phase 2 — Trackers (promises · requests · goals)

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1–1.5 days

## Goal
Promises, requests and goals persist per person and carry across meetings — a promise made in meeting A resurfaces in meeting B's Catch-up until it's done.

## Changes
- Migration: `tracker_items` table (one table, `kind` enum promise|request|goal — see plan.md data model).
- API: `backend/api/services/trackers/` — GET grouped per person (?includeArchived), POST create, PATCH update (per-kind status validation; every change appends a `history` event). Mirrored service tests.
- Catch-up stage: "Last time's promises" list — both sides' open promises with check-off / edit / archive (old-Sero prep screen shows the two lists: "«Name» promised" and "I promised", with done/archive/edit icons — mirror that).
- Requests stage: add/list requests with category chips (growth & development / ideas & suggestions / concerns & feedback) and status dropdown (new / discussed / resolved) — per the old-Sero "…has N things to discuss" screenshot.
- Goals stage: add goals, add progress notes, show per-goal history.
- `quick-add.component.ts`: promise/request/goal capture mounted on EVERY stage (decision 8).
- Session create: the "things to discuss from previous 1:1s" bullets in `state.prep` now build mechanically from open trackers.

## Not in this phase
- Rating stage UI, wrapup, AI, record template.

## Done when
- [ ] `tracker_items` rows in the DB with correct kind/status/history after a walk (query the table)
- [ ] `npm run typecheck` + `npm test` green incl. trackers service tests
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **The promise loop** — Meeting A: add a promise ("me: send the training budget"). Finish. Start Meeting B for the same person: it's waiting in Catch-up. Check it off. Start Meeting C: it's gone. ❌ Not OK if it reappears after check-off or never appears.
2. **Request carries status** — Meeting A: add a request with the "concerns & feedback" category. Finish. Meeting B: it's still there as "new"; set it to "discussed". Meeting C: still there as "discussed"; resolve it. Meeting D: gone.
3. **Goal history** — add a goal in Meeting A; add a progress note in Meeting B. Open the goal in Meeting C — both entries show with dates.
4. **Quick-add from anywhere** — while on the Rating stage, quick-add a promise. Next meeting's Catch-up lists it. ❌ Not OK if quick-added items vanish.
