# Phase 1 — Stop testing notes leaking (C1)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
A note typed during a run ("this question is repeated a lot") must never reach the manager's briefing or the text the briefing engine reads.

## Why
In the Brian run, the live testing notes were folded into the "Manager's original notes" block that the evaluator reads, and the briefing echoed it — it told the manager off for "the repeated question." That's an internal QA note surfacing in a manager-facing report.

## Changes
- `backend/engine/reviewer.ts` (~line 557, where `notes` fills `MANAGER_NOTES`): strip timestamped tester-note lines before use — lines shaped like `[14:26 @ q_alias] …` or `[14:26] …`.
- Trace one step upstream (the run-driver that concatenates testing notes into `notes`) and confirm the strip sits in the right place — ideally the manager-notes channel never carries testing notes in the first place.
- Add a small unit test for the strip so a normal manager note ("BB has hurting legs as he is growing") survives untouched while tester lines are removed.

## Not in this phase
- Any prompt wording change (that's Phases 2–4).
- The output-side ban list — the fix belongs at the input, not another output ban.

## Done when
- [ ] Genuine manager notes still reach the briefing unchanged.
- [ ] Timestamped testing-note lines are removed before the briefing engine reads them.
- [ ] `npm test` passes (baseline + new test).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Note doesn't leak** — walk a short run and, mid-run, add a testing note on a question (e.g. "repeated a lot"). Finish the run and read the manager briefing. You should see **no** mention of your testing note, and no line telling the manager off about a "repeated question". ❌ Not OK if the briefing references your note.
2. **Real notes survive** — start a run with a normal manager note ("on my mind: growth; BB has hurting legs"). That note should still shape the briefing as before. ❌ Not OK if the manager's own context vanished.
3. **Nothing else moved** — the rest of the briefing (headline, actions, scores) should look the same as a run without testing notes. This phase only removes the leak.
