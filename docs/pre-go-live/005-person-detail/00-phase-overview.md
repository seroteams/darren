# Phase 005 — Person detail

## Goal (plain)
Let a manager click a person on the Team page and see everything about their 1:1s with that person in one
place — the "manage my 1:1s with Priya" surface.

## What you'll have when it's done
- Clicking a person card opens **that person's page**: all the manager's 1:1s with them (newest first),
  each re-openable (Phase 002) and showing its rating (Phase 003).
- A small header summary: total meetings, last met, average usefulness (with its count).
- **A "Since last time" block** at the top: what you agreed and what to watch for, pulled from the most
  recent 1:1 with this person — so returning to prep the next one *helps* you, not just reminds you.
- A clear way to start the next 1:1 with that person.

## The make-or-break moment (from the CTO review): "Since last time"
The review's single biggest finding: the plan otherwise delivers **recall** (re-read a past 1:1) but not
**help** (nothing from last time reaches the next conversation) — and "it helps them run the next one" is
the stated willingness-to-pay bar. The fix is **cheap because the data already exists**: the briefing
object already carries `next_actions` (what was agreed) and `watch_for` (what to watch), `memberRunView`
already returns the full briefing, and the render for both fields already exists in `review-run.js`. So
this is **one composed block over data already on the page** — no new endpoint, no schema change, no
OpenAI call. If the latest run has neither field, hide the block (no empty scaffolding).

> **Flag for Carl:** this is a *minimal* slice of the "remembering" you deferred — it only surfaces last
> time's agreed actions/watch-fors on the person page; it is **not** the full cross-session continuity
> system (person-profiles, auto-injecting prior context into the engine), which stays deferred. Say the
> word and I'll park even this slice; the panel's view is it's the one change that makes the return visit
> land, and it's near-free.

## A grounding example (before → after)
- **Before:** Team shows a "Priya" card, but clicking it goes nowhere.
- **After:** click "Priya" → her page: 3 past 1:1s listed with their star ratings, a "★★★★☆ avg over 3
  meetings" header, and a "Prep your next 1:1 with Priya" button.

## The steps (to be detailed when this phase starts)
1. New person-detail stage (register via the stage pattern). Route like `/team/:person`.
2. Filter the manager's runs to that person (reuse the Phase 004 grouping), render the run list (reuse the
   Phase 001 row) + the summary header.
3. Render the "Since last time" block from the most recent run's `next_actions` + `watch_for` (reuse the
   existing markup; hide if absent).
4. Each row opens the read-only run detail (Phase 002). "Prep next 1:1" pre-fills intake with the person's
   name/role — **note:** this is the track's only OpenAI-spend path, and only if the manager runs the full
   pipeline (starting intake alone is free); flag it in QA so a paid run isn't triggered by accident.

## What we reuse (don't rebuild)
- Phase 001 run rows, Phase 002 run detail, Phase 003 ratings, Phase 004 grouping — this phase composes
  them into a per-person view; little new backend.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- A person with 3 1:1s shows all 3 with correct ratings and a correct average.
- Each run opens read-only; "Prep next 1:1" starts intake pre-filled.
- The fence holds (only the manager's own runs for that person).
- No OpenAI calls (except that "Prep next 1:1" *starts* a normal intake — which only spends if the manager
  runs the full pipeline, same as today); `npm test` + typecheck green.

> **Status:** overview only. Detailed step files get written when we start this phase.
