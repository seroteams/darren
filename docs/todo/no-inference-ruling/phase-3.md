# Phase 3 — Re-spec `engagement_read` (M2)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
`engagement_read` stops asserting an internal employee state and becomes an observable "listen for" — the manager's own observed shift + which events to watch, quoting input or citing an event.

## Changes
- `backend/shared/briefing.types.ts:16-22` — redefine the interface: drop/replace state-labelled `level` values (`worth_checking`, `clear_concern`); keep/lean on the already-compliant parts (`evidence[]`, `missing_evidence`, `watch_next`).
- `content/prompts/final-evaluation.md` (engagement-read rule ~lines 76, 302–318) — rewrite to the new shape; must quote/paraphrase manager input or cite an event; never assert an internal state.
- Downstream briefing renderers + `test-engagement-read.js` — follow the contract change.
- `INFERRED_STATE_LEAK` (from Phase 2) covers the new field — **remove Phase 2's temporary carve-out** for the old `engagement_read.level` enum tokens; from here the gate applies with no exemptions.

## Not in this phase
- Axis hardening, six-rules prompt pass, `outcomeCheck` (Phase 4).

## Done when
- [ ] Contract + prompt + renderers agree on the new shape; typecheck + `npm test` green.
- [ ] One targeted paid gate case (~$0.35) shows the prompt producing the new shape on a real run — **needs Carl's explicit go before running**.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Briefing reads observably** — open a briefing (replayed or the paid run). The engagement section should say what was observed and what to watch ("their last two updates were shorter — watch whether Thursday's action lands"), quoting real words. ❌ Not OK if it labels the person ("worth checking for disengagement", "clear concern").
2. **Nothing labels the employee** — search the briefing for state words (disengaged, burned out, checked out). None should appear unless the manager typed them.
3. **Screens still render** — the briefing page shows the section without errors.
