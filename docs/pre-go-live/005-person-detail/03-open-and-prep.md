# Phase 005 · Step 03 — Open a past 1:1, and prep the next one

## Goal
Make each row on the person page open its read-only briefing (PG2), and add a "Prep your next 1:1 with
<name>" button that starts a fresh intake pre-filled with that person.

## What you'll have
- Every run row on the person page opens the PG2 read-only detail (reuse `RUN_DETAIL`, don't rebuild).
- A "Prep your next 1:1 with Priya" button that opens the normal intake with her **name + role
  pre-filled**, so the manager starts the next conversation in one tap.

## A grounding example
- **Before:** Priya's rows are static text; starting her next 1:1 means retyping her name.
- **After:** click a row → read her last briefing; click "Prep next 1:1" → intake opens, "Priya / Product
  Lead" already filled in.

## Technical detail
- Rows: reuse the PG2 wiring — each row is a keyboard-operable control that routes to `RUN_DETAIL`
  (`/runs/:id`) for that run id. No new detail view.
- "Prep next 1:1": route to the existing intake stage with the person's `name`/`role` pre-filled
  (via the intake's existing prefill mechanism / query, matching how intake already accepts seed values).
  Visible focus, plain label, ≥14px.

## ⚠️ Money-path flag (must be in QA)
Starting intake is **free**. Pre-filling and opening intake spends **nothing**. The **only** OpenAI cost is
if the manager then runs the *full pipeline* from that intake — exactly the same as starting any 1:1 today.
So "Prep next 1:1" does **not** trigger a paid run by itself; it just seeds the form. Call this out in the
QA sheet so a walk-through doesn't accidentally kick off a paid pipeline expecting it to be free.

## Check
- `npm run typecheck` clean; `npm test` green. A row opens the correct read-only briefing (foreign id still
  404s — PG2 fence intact). "Prep next 1:1" opens intake with the right name/role and spends nothing until
  a full run is deliberately started.
