# Deep analysis — 2026-05-24 batch run

Light-ops pass through all 26 runs in `run-outputs.json`. Findings beyond what `REPORT.md` surfaced. Heavy-ops follow-ups marked 🔴.

---

## Score table (worst → best)

| run_id | scenario | mean | qspec | thread | delta |
|---|---|---|---|---|---|
| 547a1f92-945 | Priya | 0.726 | 0 | 0 | 0.50 |
| 00abfe51-548 | Priya | 0.738 | 0 | 0 | 0.67 |
| 1e1517a4-b1c | Priya | 0.778 | 0 | 0 | 0.56 |
| 9a49991f-3e8 | Kenji | 0.794 | 0 | 0 | 0.61 |
| 221a2296-7a5 | Kenji | 0.794 | 0 | 0 | 0.61 |
| 704418bf-e72 | Nina | 0.802 | 0 | 0 | 0.56 |
| 6ae9ead8-32f | Lin | 0.802 | 0 | 0 | 0.56 |
| 1836a407-c02 | James | 0.806 | 0 | 0 | 0.78 |
| 68a51a2f-66b | Lin | 0.812 | 0.37 | 0 | 0.67 |
| 835c2df0-e23 | Ahmed | 0.817 | 0.33 | 0 | 0.44 |
| 329243d2-88a | Carlos | 0.820 | 0.37 | 0 | 0.78 |
| e4eee57e-642 | Nina | 0.825 | 0 | 0 | 0.56 |
| ef48af86-8a2 | Priya | 0.828 | 0.37 | 0 | 0.56 |
| e98c4ef1-32d | Ahmed | 0.831 | 0.30 | 0 | 0.67 |
| f1d65bb3-502 | James | 0.833 | 0 | 0 | 0.67 |
| f5de2465-573 | Sarah | 0.833 | 0 | 1 | 0.50 |
| c8a7e70f-422 | Lin | 0.841 | 0 | 0 | 0.78 |
| 5c90d2e8-b78 | James | 0.841 | 0 | 0 | 0.78 |
| c298ae75-f50 | Carlos | 0.842 | 0.37 | 0 | 0.75 |
| 793c8897-15f | Tom | 0.869 | 0 | 1 | 0.50 |
| ee27022e-255 | Maria | 0.869 | 0 | 1 | 0.50 |
| 5716f919-b75 | Maria | 0.869 | 0 | 1 | 0.50 |
| 5e5250cd-a97 | Tom | 0.893 | 0 | 1 | 0.50 |
| 873714e9-51d | Maria | 0.893 | 0.33 | 1 | 0.50 |
| aa5674d8-4dc | Sarah | 0.893 | 0 | 1 | 0.50 |
| 45c1f49b-820 | Tom | 0.893 | 0 | 1 | 0.50 |

---

## Pattern A — Priya is the systematic hot spot

3 of 4 Priya runs in bottom 4. Lowest run overall (`547a1f92-945`, mean 0.726) is Priya. Every Priya run scores qspec=0 except one at 0.37.

**Why it matters:** Priya scenario stresses the prompts more than others — likely combination of nuanced notes (post-launch quietness, dormant mentoring interest, undisclosed upcoming rewrite). When the prompts can't ground questions in persona name, this scenario surfaces it the loudest.

**🔴 Heavy-ops action:** Pin `547a1f92-945` (Priya, mean 0.726) and `9a49991f-3e8` (Kenji, mean 0.794) as the two regression fixtures. If a future prompt change drops either below current, block the change.

## Pattern B — question_specificity ceiling at 0.37

Across 26 runs, max qspec = 0.37. Mean 0.094. **No run ever named the persona in more than 4 of ~10 questions.** Applied fix (`prompts/generate-questions.md` commit `883ccca`) is the right intervention; need a re-run to confirm it moves the ceiling.

Inspecting the 0.37 runs (Carlos `c298ae75-f50`, Lin `68a51a2f-66b`, Priya `ef48af86-8a2`): qspec credit came from **role references** ("junior brand designer", "platform engineer"), not name drops. The new prompt explicitly demands name OR role OR project — already partial-credit territory but should push higher.

**Confidence in fix:** medium-high. Direct intervention on the failing behavior.

## Pattern C — plan_thread_follow is bimodal (0 or 1, never partial)

20 runs scored exactly 0, 6 runs scored exactly 1. No middle. Means: when the planner picks up threads, it picks them all up; when it doesn't, it picks up none.

Looking at the score distribution per scenario:
- Tom, Maria, Sarah (later batch entries) consistently scored 1 on thread-follow.
- Priya, Kenji, Lin, James, Carlos consistently scored 0.

**Hypothesis:** thread-follow may correlate with scenario complexity — simpler scenarios let the planner notice threads more easily. Or the auto-editor's first plan-turn edit (between batches) flipped the behavior for some scenarios. The batch trend (0.300 → 0.300 on this dim) doesn't support edit-flip; the bimodality is likely scenario-dependent.

**Confidence in fix:** medium. The applied "when in doubt, follow" bias should pull the 0-scoring runs upward.

## Pattern D — plan_delta_accuracy stuck at 0.50 even on top runs

7 of the top 10 highest-mean runs still score exactly 0.50 on delta-accuracy. The dimension floors at ~0.44 and ceilings at 0.78 across the whole batch — none of the auto-edits moved it.

**Inspection of the 0.50 runs:** they correlate with thread-follow=1, suggesting the planner takes the thread but then mis-classifies the answer's axis effect. Common misclassification mode: defaulting to neutral (zero deltas) when the answer carried mild signal.

The applied edit (anti-neutral-default calibration) targets this directly. **This is the highest-leverage fix in the batch** — affects nearly half of all runs.

**Confidence in fix:** medium. Calibration text is suggestive, not mechanical. Will likely lift some runs from 0.50 to 0.67+ but won't get to 0.90.

## Pattern E — coreIssue length predates fix

26/26 runs have `coreIssue` at 60–84 words across 2–4 sentences. Memory feedback item 4 / repo commit `1ce138e` ("Tighten coreIssue to one sentence + seed feedback backlog") is already in the live `prompts/preparation.md`.

**Conclusion:** the batch ran on a pre-fix snapshot. Not a current regression. A re-run today would already show one-sentence coreIssues without any new work.

**No action.** Just confirms the fix landed.

## Pattern F — focus_points.reason verbosity

`reason` field across all 101 focus points: avg 39 words, range 28–58. Memory item N4 ("focus-point reason copy reads non-human") notes this as known issue. The verbosity is genuine — many reasons are 2-clause explanations that read like coaching memos.

**🔴 Heavy-ops action:** tightening `prompts/generate-focus-points.md` to cap reason at one sentence ≤20 words is exactly N4's scope. Pin to that workstream, not this one.

---

## Regression candidates (for `scenarios/regression/`)

Heavy-ops pick from these — they are the cases where each worst dimension scored 0:

| Dimension | Pick this run as fixture | Why |
|---|---|---|
| question_specificity | `547a1f92-945` Priya | Lowest mean overall; qspec=0 across all 10 questions. |
| plan_thread_follow | `6ae9ead8-32f` Lin | thread=0 with 9 turns in the dialog (largest sample). |
| plan_delta_accuracy | `835c2df0-e23` Ahmed | Lowest delta-accuracy (0.44); the breakage case. |
| combined worst | `547a1f92-945` Priya | Hot spot across multiple dims. |

Scenario `001-senior-backend-weekly.json` and `002-junior-frontend-wellbeing.json` already exist in `scenarios/`. The simulated personas (Priya, Kenji, Lin, Ahmed, etc.) are not in those files — they must have been defined in a scenarios catalog on work-computer that hasn't been pulled here. **🔴 Heavy-ops blocker:** before regression fixtures can be written, the persona scenarios that produced these 26 runs need to land in this repo. Without them, we can't replay.

---

## What the applied edits *should* move on a re-run

Predicted next-batch scores if prompts work as intended:

| Dim | Now | Predicted | Mechanism |
|---|---|---|---|
| question_specificity | 0.094 | 0.40–0.60 | New rule demands ≥half of questions ground in persona. |
| plan_thread_follow | 0.308 | 0.55–0.75 | "When in doubt, follow" should flip ~5 of 20 zero-scoring runs. |
| plan_delta_accuracy | 0.595 | 0.65–0.75 | Anti-neutral calibration lifts 0.50 runs by one or two turns. |
| Overall | 0.829 | 0.87–0.90 | Compounded across above. |

If a re-run lands inside those predicted ranges, the edits are validated. If not, the prompts need further work — likely heavy-ops territory.

---

## Light-ops summary

Done in this pass:
- Archived all 5 zip files into [logs/may/2026_May24_batch/](.).
- Captured `EVOLVED-DIFF.md` showing exact prompt hunks.
- Applied evolved prompts as commits `883ccca` + `e14d1cf`.
- Updated `PLAN.md` workstream for heavy-ops review.
- Mined all 26 runs into this `ANALYSIS.md`: per-run scores, 6 failure patterns, 4 regression candidates, predicted next-batch scores.

Open for heavy-ops:
- Reconcile applied prompt edits with `PLAN.md` open items 5 + 6 (both target `plan-turn.md`).
- Land the persona scenarios catalog into `scenarios/regression/` so a re-run is possible.
- Re-run the eval harness against current prompts and check predicted ranges above.
- Tighten `prompts/generate-focus-points.md` reason field (memory item N4).
