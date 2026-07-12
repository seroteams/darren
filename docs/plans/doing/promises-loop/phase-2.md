# Phase 2 — Card zero: resurface + close-out

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Starting a 1:1 with someone you've met before opens on last time's promises — manager's own first — closed off with one tap each before question 1.

## Changes
- **Read path** — service that fetches the most recent finished run for the same manager + same `personId` carrying `promises[]` (reuse the `focusHistoryFor` / `pgFocusHistory` fence pattern in `backend/engine/focus-history.ts` / `backend/db/runs-store.ts`). Exposed to the runner with the session (no extra round-trip on every turn).
- **Write path** — endpoint to record the taps: writes each promise's `outcome` back onto the PRIOR run's `promises[]` and sets that run's `outcomeCheck` roll-up (the spec §6 consumer). Declared facts only.
- **Card zero UI** — in `admin/src/stages/questioning.js`, before the first `getQuestion()`: if prior promises exist, render the "Before question 1" card from the mock (turn-label override like the agenda check): promises manager-first with owner pills, yes/partly/no/changed chips, "Start the questions →" enabled once all tapped; a quiet skip for the in-a-rush case. No prior promises → straight to question 1 exactly as today.
- **Current session carries the check-in** — store the tap results on the current session too (`priorCheckin` or similar) so phase 3's engine feed reads its own session, not a second query.

## Not in this phase
- Question 1 does not react to the taps yet (phase 3).
- No changes to person-detail / member surfaces (phase 3).

## Done when
- [ ] `npm test` + `npm run typecheck` green.
- [ ] Verify the DESTINATION: after tapping, the PRIOR run's stored state shows each promise's `outcome` + the `outcomeCheck` roll-up — read the stored record itself.
- [ ] First-ever 1:1 with a person shows no card zero and nothing breaks.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **The loop closes** — with a phase-1 run in the bag (promises confirmed), start a NEW 1:1 with the same person. Before question 1 you should see "Before question 1" with those exact promises, yours listed first, each with Yes/Partly/No/Changed. ❌ Not OK if question 1 appears first, or promises show for a different person.
2. **One tap each, then go** — "Start the questions" should stay greyed until every promise is tapped, then question 1 arrives as normal.
3. **It really wrote back** — open the PREVIOUS run from Past 1:1s: each promise now shows the outcome you tapped. ❌ Not OK if outcomes show only in the new session.
4. **Fresh person, no ghost card** — start a 1:1 with a brand-new person. No card zero, straight to question 1.
5. **The skip** — start another 1:1 with the tracked person and skip the check-in. Questions proceed; promises stay open (no outcomes invented). ❌ Not OK if skipping fabricates outcomes.
