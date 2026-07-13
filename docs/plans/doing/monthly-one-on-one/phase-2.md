# Phase 2 — Trackers (promises · requests · goals) + side panels

**Part of:** [plan.md](plan.md) · **Status:** ⬜ · **Size:** ~1.5 days

## Goal
Promises, requests and goals persist per person and carry across meetings — a promise made in meeting A resurfaces in meeting B's Catch-up with one-tap outcomes; requests and goals open in the right-hand side panel and keep status/history until resolved.

## Changes
- Migration: `tracker_items` table (one table, `kind` enum promise|request|goal — see plan.md data model, incl. `progress` for goals).
- API: `backend/api/services/trackers/` — GET grouped per person (?includeArchived), POST create, PATCH update (per-kind status validation; every change appends a `history` event). Mirrored service tests incl. fence tests.
- Catch-up stage: "Last month's promises — did they happen?" — open promises for the pair, manager's own FIRST, outcome chips Done / Partly / Not yet / Changed (one tap each, per the prototype); outcomes stored in session state, applied to the tracker rows at complete(). New promises for next time captured here too.
- Requests stage: rows (text · category · status pill · chevron) → **click opens the side panel**: status select (New / In progress / Resolved), detail, discussion notes, next step. "+ Add request" opens the panel as a form. Categories: growth & development / ideas & suggestions / concerns & feedback.
- Goals stage: rows (text · % · status pill · chevron) → **click opens the side panel**: progress bar + % edit, status select (Not started / In progress / Done), progress history (dated events from `history`), "add an update". "+ Add a new goal" opens the panel as a form.
- Session create snapshots the person's open trackers into the session context (so the runner renders without extra fetches).
- People-merge: resolve `merged_into_id` one hop at create/read.

## Not in this phase
- Rating persistence, wrapup, AI, record template, member lane (Phase 7 reuses the trackers API).

## Done when
- [ ] `tracker_items` rows in the DB with correct kind/status/history after a walk (query the table)
- [ ] `npm run typecheck` + `npm test` green incl. trackers service tests
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **The promise loop** — Meeting A: add a promise ("me: send the training budget"). Finish. Meeting B, same person: it's waiting in Catch-up; tap "Done". Meeting C: it's gone. ❌ Not OK if it reappears after Done or never appears.
2. **Request carries status** — Meeting A: add a request (category "concerns & feedback"). Meeting B: still there as New; open its panel, set In progress, add a note. Meeting C: still In progress with the note in history; resolve it. Meeting D: gone from the default list.
3. **Goal history grows** — add a goal in Meeting A; in Meeting B open its panel, add an update + move progress to 40%. Meeting C: panel shows both dated entries and 40%.
4. **Panels behave** — panel opens on row click, closes on X / backdrop / Esc; nothing saved unless you hit Save. ❌ Not OK if a cancelled edit sticks.
