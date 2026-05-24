# 2026-05-24 batch run (aggregate, not single-run)

Source: `batch-data.zip` produced by the work-computer eval+self-edit harness on 2026-05-24.

**Not a `reviewrun` target.** This directory is cross-run aggregate, not the single-run shape (`01-focus-points/`, `02-intro-questions/`, transcript, axis-state) that the `reviewrun` skill expects. Do not point `reviewrun` at it.

## Contents

| File | Purpose |
|---|---|
| `REPORT.md` | Human summary: 14 quality dimensions, worst-case scores, prompt edits applied. |
| `quality-report.json` | Machine version of the report; includes failing `run_id`s per dimension. |
| `run-outputs.json` | Array of all 26 per-run logs (stages, scores, costs). Mineable corpus. |
| `prompts-evolved/generate-questions.md` | Evolved prompt after 2 auto-edits during batch. |
| `prompts-evolved/plan-turn.md` | Evolved prompt after 2 auto-edits during batch. |
| `EVOLVED-DIFF.md` | Side-by-side diff: live `prompts/*.md` ↔ this dir's `prompts-evolved/*.md`, captured at adoption time. |

## Headline

- **26 runs** across 2 batches. Total cost **$12.61**.
- Overall score **0.820 → 0.839**.
- Worst dimensions: `question_specificity` (0.094), `plan_thread_follow` (0.308), `plan_delta_accuracy` (0.595).
- 4 prompt edits applied by the auto-editor: 2× `generate-questions.md`, 2× `plan-turn.md`. The evolved versions in `prompts-evolved/` are the final state after both edits.

## Adoption status

The evolved prompts were copied into `prompts/generate-questions.md` and `prompts/plan-turn.md` on 2026-05-24 by light-ops per user direction. See `EVOLVED-DIFF.md` for the exact hunks and `PLAN.md` workstream "Adopt batch-run learnings (May 24)" for heavy-ops follow-up.
