# Phase 2 — Trackers (promises · requests · goals)

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1–1.5 days

## Goal
Promises, requests and goals persist per person and carry across meetings — a promise made in meeting A resurfaces in meeting B's Catch-up until it's done.

## Changes
- Migration: `tracker_items` table (one table, `kind` enum promise|request|goal — see plan.md data model).
- API: `backend/api/services/trackers/` — GET grouped per person (?includeArchived), POST create, PATCH update (per-kind status validation; every change appends a `history` event). Mirrored service tests.
- Catch-up stage: "Last time's promises" list — both sides' open promises with check-off / edit / archive (old-Sero prep screen shows the two lists: "«Name» promised" and "I promised", with done/archive/edit icons — mirror that).
- Requests stage: add/list requests with category chips (growth & development / ideas & suggestions / concerns & feedback) and status dropdown (new / discussed / resolved) — per the old-Sero "…has N things to discuss" screenshot. (Typed question prompts per category are PARKED — plan.md, Carl 2026-07-11.)
- Goals stage — per the old-Sero "Review N goals together" screen: each goal row shows title, **progress %** (0–100, manager-edited), status dropdown (not started / in progress / done), a notes/comments count, and an expandable detail (history). "Add a new goal" button below the list. Header copy pattern: "Review {n} goals together — go through {name}'s current goals. Discuss progress, blockers, and celebrate wins."
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
3. **Goal history** — add a goal in Meeting A; in Meeting B set it to "in progress" at 40% with a progress note. Open the goal in Meeting C — the % and both history entries show with dates.
4. **Quick-add from anywhere** — while on the Rating stage, quick-add a promise. Next meeting's Catch-up lists it. ❌ Not OK if quick-added items vanish.
