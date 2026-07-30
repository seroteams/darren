# User-test fixes — Machar session, Jul 29

**Goal:** Every sticky from Carl's Figma "TO FIX" board (Machar test, machar-2026-07-29) is fixed and tested, so next week's testers see a cleaner app.
**Driver:** Carl
**Created:** 2026-07-29
**Mockup:** https://claude.ai/code/artifact/0295a4fe-db2c-42e6-bee4-b39363aef32a — approved 2026-07-29

## Done means
- The live-scores explanations never show a `[CAPITAL-CODE]` word.
- The recap's Final read looks like the runner's slider meters, on screen and in the PDF.
- The recap has no floating dots, no empty date pills, no oversized top gap.
- "Copy QA prompt" is invisible on the live site.
- The lock-in screen says what it's for and what skipping costs.
- A Performance & feedback meeting never gets an off-focus stock question.

## Resolved before we start
- The duplicate explanation under two scores and the wellbeing over-fire were fixed this morning (machar-fixes-jul-29, closed). Not re-done here.
- `[THREAD-DEFERRED-WINDDOWN]` comes from the planner's note contract (`content/prompts/plan-turn.md:108`); engine readers parse the tags, so stripping happens at the stream boundary (`session-streams.ts`), not in the engine.
- The runner meter and recap bars are two unrelated hand-rolled components; the recap side (`axes.js` / `axes.css`) is lane-clean, the runner side is claimed by another chat. Recap adopts the runner's look (Carl's call).
- Stock questions live in `content/questions/_seed/` (8 files, no focus metadata); `enforceAxisCoverage` and the closer/overflow paths pick them focus-blind.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Rating panel: kill the code-word leak | Score explanations always read as plain sentences | ✅ |
| 2 | End-of-meeting screens | Lock-in copy, Final read matches runner, recap tidy, QA button local-only | ✅ |
| 3 | Engine: stock questions respect the focus | No more off-focus stock questions | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
ALL 3 PHASES ✅ — plan CLOSED 2026-07-30. P1 green-lit after Carl's 1:1 walk (205610c4); P2+P3 built on his "continue and finish this" and green-lit after his walk (7bdb06e2, 1ce13d35). Total paid spend: $0.19 (one gate run). Everything committed local; ships on the next "go live" — the QA button's absence on the live site is the one check that rides that deploy.
Board: https://claude.ai/code/artifact/be9f62dc-b0d6-44d6-885b-496122b21da3

## Parked
- `stage-recap-sections.js` has the same empty-bullet and date-pill gaps — claimed by another chat's lane (a6878b4e); fix there when that lane clears.
- Full planner-grounding scopes B/C (`docs/plans/future/planner-grounding/plan.md`) — the deeper question-drift fix; Carl chose the focus filter for now.
- Belt-and-braces client-side tag strip in the coach panel — lane fff2a82e owns those files.
- Machar F3 (a way to hold/defer a question) and F8 (live-scores looked stuck once — watch) — logged in `docs/validation/machar-2026-07-29.md`, not in this plan.
