# Run QA fixes — Brian run (Jul 04)

**Goal:** Fix the four grounded defects from the Brian bi-weekly run so the next run reads more realistic and honest: no repeated questions, no inflated wellbeing score on rough input, no manager notes quoted as the student's own words, and no testing note leaking into the briefing.
**Driver:** Carl
**Created:** 2026-07-04

Source review: the "melodic-rabbit" A–E write-up — a local session scratch doc under `.claude/plans/`
(never committed to the repo, and no longer present). The four defects it found are captured in the phase
table below, so this plan stands on its own without it.
Run reviewed: `logs/july/2026_Jul04_14-23-4b3931311f7d411093c5cef545f22615`.

## Done means
- A walked run no longer asks the same question eight ways — questions spread across topics.
- Wellbeing isn't scored badly just because a place/time was named ("when writing", "after school") with no feeling attached.
- The briefing never writes `he said "…"` for a note the manager wrote in the third person.
- A testing note typed mid-run never shows up in the manager's briefing or its input.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Stop testing notes leaking (C1) | Strip QA note lines before they reach the briefing | 🔨 built + unit-tested, awaiting a walked run |
| 2 | Question variety (B1) | Bank no longer minting one topic eight ways | ⬜ |
| 3 | Honest wellbeing scoring (B2) | Scorer needs stated strain, not just a place/time | ⬜ |
| 4 | Who said it (B3) | No third-person note quoted as the student's speech | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Folder scaffolded, awaiting Carl's confirmation to start Phase 1. No baseline run yet (runs when a phase starts). Nothing built.

Note on testing: Phases 2–4 are prompt changes — their effect only shows in a **live** walked run (an OpenAI call, ~$0.35). Phase 1 is a code strip and can be checked without a paid run. Carl green-lights each phase by walking a run and eyeballing the output; paid runs need his explicit go-ahead for that specific run.

## Parked
- **C2 — semantic/embedding dedup** in `question-eligibility.ts`. Heavier and riskier; B1 should remove the variants before they're queued. Revisit only if repeats survive B1.
- **B4 — skip-aware caps** (`plan-turn.md`): after 2 skips on one axis, switch axis. Follow-up.
- **B5 — weak-axis honesty** (`reviewer.ts applyAxisConfidence` magnitude gate): mostly falls out of B2. Belt-and-braces follow-up.
- **B6 — partial-read bullet count** hard `== 1` (`final-evaluation.md`). Small follow-up.
- **A9 — rename `brutal_truth_*` JSON keys** to softer manager language. Touches UI/schema; park.
