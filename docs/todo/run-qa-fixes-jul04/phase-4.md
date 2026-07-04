# Phase 4 — Who said it (B3)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
The briefing must not put words in the student's mouth. If the manager wrote a note in the third person ("he is writing", "his english homework"), the briefing shouldn't quote it as `he said "…"`.

## Why
In the Brian run, every answer was the manager's shorthand ("he", "his") — but the briefing wrote *he said "Effects when he is writing"* and quoted *"his english homework"* as Brian's own words. That blurs what Brian actually said versus what the manager wrote down.

## Changes
- `content/prompts/final-evaluation.md` (`Source separation` ~line 39; `brutal_truth_rules` ~line 190): add a hard, checkable rule —
  - When a note is third-person ("he/she/they…"), it's the manager's paraphrase — never wrap it in quotes attributed to the report (no `he said "…"`).
  - Quote only first-person report speech. For a third-person note, describe the behaviour neutrally: "the notes record his legs bother him when writing", not `he said "Effects when he is writing"`.

## Not in this phase
- Renaming the `brutal_truth_*` fields (parked as A9).
- The partial-read bullet-count rule (parked as B6).

## Done when
- [ ] The briefing never quotes a third-person manager note as the student's speech.
- [ ] Genuine first-person quotes (if a run has them) are still allowed.
- [ ] `npm test` still passes.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. This is the last phase. (Needs a live walked run — ~$0.35; say go first.)
1. **Third-person note** — walk a run where the manager writes notes about the person in the third person ("he's been quiet", "his homework"). Read the briefing. It should describe the behaviour ("the notes record he's been quiet"), not put it in quotes as if the person said it. ❌ Not OK if you see `he said "…"` for a note you wrote about them.
2. **Real quote still fine** — if a note captures the person's own words in the first person ("I'm exhausted"), the briefing may still quote that. ❌ Not OK if genuine quotes disappeared.
3. **Reads naturally** — the neutral phrasing should still sound like a manager wrote it, not stiff or robotic.
