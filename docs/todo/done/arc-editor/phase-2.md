# Phase 2 — Read API + read-only in-app view

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ (green-lit 2026-06-14)

## Goal
A new "Meeting arcs" page inside the app shows every meeting type and its full arc — phases,
intents, target question counts, tone, anti-patterns. View only (editing comes in Phase 3).

## Changes
- New handler `frontend/server/handlers/arcs.js` → `GET /api/arcs`: returns the merged arc
  for all five types, each field flagged `edited: true/false` (overlay vs code default).
- Route registered in `frontend/server/server.js` (GET, read-only — no origin guard).
- `getArcs()` wrapper in `frontend/client/src/api.js`.
- New stage `frontend/client/src/stages/meeting-arcs.js`, modelled on
  `stages/job-lexicons.js`: one section per type listing phases (label · intent · target Qs),
  the tone line, and the anti-patterns.
- A left-rail nav entry pointing to the new page.

## Not in this phase
- No editing, no save button — display only.
- No "edited" styling beyond what's trivially available (the flag exists but nothing is
  edited yet until Phase 3).

## Done when
- [ ] The new page lists all five meeting types with their phases in order.
- [ ] Each phase shows its label, intent, and target question count; each type shows its
      tone and anti-patterns.
- [ ] The page is reachable from the left-rail nav.
- [ ] What the page shows matches the code arcs exactly (spot-check bi-weekly + growth).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Find the page** — open the app, click the new "Meeting arcs" item in the left nav.
   You should see all five meeting types. ❌ Not OK if any type is missing.
2. **Bi-weekly reads right** — its phases should be Pulse → Friction → Momentum → Lift,
   with intents and "1, 2, 2, 1" target questions. ❌ Not OK if order or counts are wrong.
3. **Growth reads right** — Anchor → Aspiration → Gap → Investment → Commitment, with its
   tone line and anti-patterns shown.
4. **It's read-only** — there are no edit boxes or save buttons yet; nothing is changeable.
