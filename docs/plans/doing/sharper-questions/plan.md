# Sharper questions

**You asked for:** "id like you to be sceptical about our repo ... lets maks meke a plan onw aht we mUST fix" → "can you go deeper now ot SHOULD change." → "a" (Move A: fix the questions)
**Goal:** Sero asks the sharp question in the meeting instead of pointing it out in the recap afterwards, and we can measure whether it did.
**Driver:** Carl
**Created:** 2026-08-02
**Mockup:** none. Engine and prompt work, no new screen or layout.

## Done means

- When a report says something has stalled, the **next question asks what they will do about it**. Today that observation only appears in the briefing, after the meeting is over.
- Every run reports how many of its questions bought nothing, so question quality is a number we can watch instead of a feeling.
- The wellbeing dial reads more often than it comes back blank.
- Two briefings about two different people do not read like the same form.

## Why this, now

Machar is the only real manager who has used Sero end to end. His one substantive
criticism (`docs/validation/machar-2026-07-29.md`, F1) was that the best insight
landed on the summary page instead of being asked in the room. The pass bar for
validation is 2 of 3 managers returning unprompted. Nothing else on the SHOULD list
moves that number.

## Resolved before we start

Dug out of the code so no phase stalls on an unknown.

- **The agency fix already shipped and stopped working.** The rule is at
  `content/prompts/plan-turn.md:278` ("THE TRIGGER"), appending `[AGENCY]` to the
  planner note when it fires. Measured: it fired in **2 runs, both 29 July**, the day
  it shipped, and never since. A plain grep shows 71 files, but 61 of those are
  `*-prompt.md` copies of the rule text. Real firings: 2 runs.
- **Nothing enforces it.** No hit for `AGENCY` in `backend/engine/golden-checks.ts`,
  `backend/engine/run-health.ts`, or `evals/`.
- **The mechanism to enforce it already exists.** `content/prompts/rule-registry.ts`
  couples a prompt rule to its gate, and `scripts/test-rule-registry.js` verifies every
  row **offline inside `npm test`** (free). Eight rules already use it. The agency rule
  belongs there. Extend this, do not build something new.
- **The judge grades the wrong half.** `backend/engine/regression-judge.ts:25-33` has
  8 dimensions, all scoring the briefing. The transcript is passed in (`:59`) and never
  scored. So the artefact Machar complained about is the one thing we do not grade.
- **Baseline, measured across 76 saved transcripts / 489 turns:**
  - 100 of 489 turns produced empty or all-zero `realized_deltas` (about 1 in 5 questions bought nothing)
  - wellbeing read in 23 of 56 briefings, not read in 33 (59% blank)
  - `next_actions` was exactly 2 in 55 of 57 briefings; `watch_for` opened with "Before next..." in 54 of 57
- **Why wellbeing goes blank is structural, not a model failure.** Axis-coverage rule 6
  (`plan-turn.md:203`) is "hard at turn 4+", but in a 6-turn session turn 4 leaves
  `remaining_budget = 2`, which triggers wind-down (`:122`) and forbids new items. The
  rule's window is one turn wide.
- **Five contradictions in the rule sheet**, sharpest being two rules that each claim
  the first `new_queue` item MUST be theirs (thread-follow `:34` vs agency `:278`) with
  no tiebreak. A snag-naming answer triggers both. This is why the agency rule is a
  coin flip.
- **Cost:** a full run measured at **$0.198**. Smallest paid proof is
  `node scripts/gate.js --only <case>` at roughly **$0.35**. Free checks (npm test,
  typecheck, replay against saved transcripts) prove most of this list without spending.

## Phases

| # | Phase | What it lands | Status |
|---|-------|---------------|--------|
| 1 | Count what is happening | Question quality becomes a number: a judge dimension that grades the questions, plus a zero-signal and agency counter per run, with a baseline over the 76 saved runs | ✅ |
| 2 | Make the sharp question get asked | The five rule-sheet contradictions get explicit tiebreaks, and the agency rule gets a gate + registry row so it cannot silently stop firing again | 🔨 |
| 3 | Make sure wellbeing gets asked | Widen the axis-coverage window so a wellbeing question can land before wind-down closes the session | ⬜ |
| 4 | Stop every briefing reading the same | Let the briefing's counts and openers flex, so four reports in a week do not produce four identical forms | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state

**Phase 1 ✅ green-lit 2026-08-02. Phase 2 in progress.**

The before-numbers are now measured, not estimated: across 76 saved runs, **94 of 483
asked questions moved nothing (19.5%)**, and the agency rule fired on **2 turns in 2
runs, both dated 29 July**. That is the bar Phase 2 has to beat. Full detail and proof
in [phase-1.md](phase-1.md). Cost so far: $0.

**Board:** https://claude.ai/code/artifact/5e5231b9-e326-492a-b3d1-342beb00cefb

Baseline for the whole plan (free ring, run 2026-08-02 on main at `db7aaf04`):
`npm test` 231/231 · `npm run typecheck` clean · `typecheck:admin` clean ·
`typecheck:customer` clean · `npm run lint:copy` clean · `npm run replay` 7/7 still good.
No paid baseline taken yet, deliberately. Phase 1 is provable offline.

Pre-existing and NOT caused by this work: `npm run lint` fails (18 errors) and
`npm run lint:components` fails (1 violation). Both are on the SHOULD list, neither is
in CI, and neither is touched by this plan.

## Parked

Good ideas that are not this plan. From `sero-should-fix-review.md` unless noted.

- **Question bank bloat** — 9.5 questions generated per run, 1.4 asked; 4,683 reusable YAML files.
- **Nothing lints the stored question pool** — 189 files with a banned dash, 49 with banned jargon, 44 with the retired `You said "..." —` shape. `scripts/lint-bank.js` was deleted, not promoted.
- **Person identity is still `slugify(name)`** (`person-profile.ts:83-90`) so two Sarahs merge.
- **Dead prompt weight** — `unbooked_signal` populated in 4 of 489 turns; the agenda carry-forward block sentinel-empty in 61 of 62 prompts; `final-evaluation.md` (38k chars) is not under `lint:prompt-size`.
- **Scoring skew** — down:up bookings were 4.0:1 before the better-reads fix and 4.8:1 after. Mechanism shipped, outcome has not moved.
- **The plan-turn cached prefix stops ~1,400 tokens short** (~10% of a run). Already known and correctly parked until validation ends.
- Tier 2 money and load fixes (the blind cost tracker, the 1.2MB per-run artifact, the missing per-user cap), Tier 3 guard gaps, Tier 4 commercial items. All in the review doc.
