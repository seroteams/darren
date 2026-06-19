# Phase 3 — Attribution anti-example

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Stop the briefing from quoting the manager's rough shorthand as if the employee said those exact words.

## Why
On the Maya run the briefing wrote: *'The key moment was when Maya said "main screens only → gaps in review"'*. That phrase is the **manager's** third-person note (with an arrow no one speaks aloud), not Maya's speech. The prompt already has an attribution rule, but it's abstract — it needs a concrete example to bite.

## Changes
- `prompts/final-evaluation.md` (`<read_quality_gate>` attribution block + `<brutal_truth_rules>`): add a hard rule plus a BAD/GOOD pair using this exact run:
  - **BAD:** `Maya said "main screens only → gaps in review"`.
  - **GOOD:** `The notes show Maya ships before checking the full flow.`
  - Rule of thumb: notes with arrows (→), slashes, sentence fragments, or third-person "she/he" are the **manager's** shorthand — describe the behaviour neutrally; only quote the employee when the note is clearly their own words.

## Not in this phase
- A code-level attribution lint (could be added later if prose isn't enough).
- Tagging note source at capture time (Parked P6) — the structural fix.

## Done when
- [ ] On the Maya run, no briefing field claims Maya "said" / "named" / "proposed" the arrow-notation phrase.
- [ ] Brutal-truth fields describe the behaviour in neutral words and still land the point.
- [ ] `npm test` passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **No misquote** — replay the Maya run. The briefing should describe what the notes show, not put `"main screens only → gaps in review"` in Maya's mouth. ❌ Not OK if it still says Maya "said" the shorthand phrase.
2. **Real quotes survive** — in a run where the employee genuinely speaks a phrase (first-person), the briefing may still quote it. ❌ Not OK if it now refuses to quote anything at all.
3. **Point still lands** — the neutral wording should still make the same observation clearly. ❌ Not OK if the briefing goes vague to avoid the quote.
