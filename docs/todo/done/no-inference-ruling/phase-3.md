# Phase 3 — Re-spec `engagement_read` (M2)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ (green-lit by Carl 2026-07-05 — "A": confirming paid run + commit)

**Confirming run (2026-07-05, ~$0.35):** `gate --only feels-off-james` PASS again, and the shipped
`observed_shift` now reads "you noted less present in rituals lately" — anchored in the manager's own note
vocabulary with three verbatim transcript quotes. The echo fix is live-proven. Track spend: ~$0.70 total.

**Build notes (2026-07-05):**
- New shape shipped: `read_status: "read" | "not_read"` (evidence status, never a person label) + `observed_shift`
  (near-verbatim restatement of the manager's own note) replacing the `level` state-label enum. Legacy stored
  runs are normalised on read (`normalizeLegacyEngagementRead`); the admin renderer keeps a legacy branch for
  old briefings. The 7 replay baselines were re-frozen to the new shape (verdicts unchanged, all PASS).
- Phase 2's gate carve-out removed — the whole `engagement_read` block is scanned now.
- **Live find on the paid case (feels-off-james, ~$0.35, gate PASS):** the model's `observed_shift` echoed a
  rule-text example ("updates got shorter") instead of the manager's actual note ("engagement in rituals
  dipped"). Fixed twice over: the echoable example was removed from the prompt, and `EVIDENCE_ANCHOR` now
  hard-fails any non-empty `observed_shift` that shares no content with the notes — the same run would FAIL
  today. A confirming paid re-run is Carl's call (another ~$0.35).

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
- [x] Contract + prompt + renderers agree on the new shape; typecheck + `npm test` green (75/75).
- [x] One targeted paid gate case (~$0.35) shows the prompt producing the new shape on a real run — ran `gate --only feels-off-james`, PASS, new shape verified in the shipped `final.json`; surfaced the rule-echo find above.
- [x] Product owner said go ("A", 2026-07-05) — chose the confirming paid run over a manual walk; echo fix live-proven.

## Test scenarios — for the product owner
1. **Briefing reads observably** — open a briefing (replayed or the paid run). The engagement section should say what was observed and what to watch ("their last two updates were shorter — watch whether Thursday's action lands"), quoting real words. ❌ Not OK if it labels the person ("worth checking for disengagement", "clear concern").
2. **Nothing labels the employee** — search the briefing for state words (disengaged, burned out, checked out). None should appear unless the manager typed them.
3. **Screens still render** — the briefing page shows the section without errors.
