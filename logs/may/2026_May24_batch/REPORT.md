# Batch Testing Report

## Summary
- 26 completed runs across 2 batches
- Cost: $12.61
- Overall score: 0.820 → 0.839

## Quality Scores

| Dimension | Mean | Min | Max |
|-----------|------|-----|-----|
| question_specificity | 0.094 | 0 | 0.37 |
| plan_thread_follow | 0.308 | 0 | 1 |
| plan_delta_accuracy | 0.595 | 0.444 | 0.778 |
| eval_actionability | 0.756 | 0.333 | 1 |
| focus_relevance | 0.923 | 0 | 1 |
| prep_specificity | 0.942 | 0 | 1 |
| eval_specificity | 0.981 | 0.5 | 1 |
| eval_no_restatement | 1 | 1 | 1 |
| focus_diversity | 1 | 1 | 1 |
| length_compliance | 1 | 1 | 1 |
| parse_success_rate | 1 | 1 | 1 |
| plan_queue_coherence | 1 | 1 | 1 |
| question_arc_coverage | 1 | 1 | 1 |
| question_no_overlap | 1 | 1 | 1 |

## Worst Dimensions (need work)

### question_specificity (mean: 0.094)
- Priya: score 0 — 0/10 mention persona
- Tom: score 0 — 0/9 mention persona
- Priya: score 0 — 0/8 mention persona
- Maria: score 0 — 0/10 mention persona
- James: score 0 — 0/9 mention persona

### plan_thread_follow (mean: 0.308)
- Priya: score 0 — 0/7 threads followed
- Priya: score 0 — 0/9 threads followed
- James: score 0 — 0/9 threads followed
- Lin: score 0 — 0/9 threads followed
- Kenji: score 0 — 0/7 threads followed

### plan_delta_accuracy (mean: 0.595)
- Ahmed: score 0.4444444444444444 — 4/9 turns scored correctly
- Priya: score 0.5 — 4.5/9 turns scored correctly
- Tom: score 0.5 — 4.5/9 turns scored correctly
- Maria: score 0.5 — 4.5/9 turns scored correctly
- Sarah: score 0.5 — 4.5/9 turns scored correctly

## Prompt Edits Applied

- **prompts/generate-questions.md** (improvement): ["793c8897-15f","00abfe51-548","ee27022e-255"]
- **prompts/plan-turn.md** (improvement): ["00abfe51-548","f1d65bb3-502","6ae9ead8-32f","835c2df0-e23","793c8897-15f","ee27022e-255"]
- **prompts/generate-questions.md** (improvement): ["45c1f49b-820","1e1517a4-b1c","5716f919-b75"]
- **prompts/plan-turn.md** (improvement): ["1e1517a4-b1c","5c90d2e8-b78","c8a7e70f-422","45c1f49b-820","5716f919-b75","aa5674d8-4dc"]

## Batch Trend

- batch_1_5b69155f: 0.820
- batch_2_64714e57: 0.839
