# Sweep digest (2026-05-31T11:22:55.246Z)

- Total personas: 13
- Verdict tiers: pass 1 / watch 1 / fail 11
- Heuristic overall mean: 0.856
- Delta vs prior sweep: qspec -0.297 | thread 0.393 | delta 0.024 | overall 0.04

## Per-type

| Meeting type | Pass | Watch | Fail | Judge mean | Heuristic mean |
|---|---:|---:|---:|---:|---:|
| Performance & feedback | 0 | 1 | 2 | 1.667 | 0.722 |
| Something feels off | 0 | 0 | 3 | 1 | 0.889 |
| Bi-weekly check-in | 0 | 0 | 2 | 1 | 1 |
| Growth & career plan | 0 | 0 | 2 | 1 | 0.783 |
| Onboarding check-in | 1 | 0 | 2 | 2 | 0.909 |

## Worst fails

### James (james-something-feels-off.json)
- Meeting type: Something feels off
- Judge score: 1/5 (fail)
- Evidence: Transcript is empty; stage coverage shows 0/4 matched stages; final turn is missing and non-substantive.
- Flags: No transcript provided | No landing/observation/underneath/support arc evidence | Missing final closer turn

### Sarah (sarah-performance-feedback.json)
- Meeting type: Performance & feedback
- Judge score: 1/5 (fail)
- Evidence: The transcript is empty ([]). None of the required stages appear: self-read, evidence, gap naming, cause, or commit. final_turn_check shows has_final_turn=false, so there is no employee-shaped next focus/support ask or concrete commitment.
- Flags: Preparation brief appears mismatched to a different persona/topic (James/Director promotion) rather than Sarah/Senior Data Scientist performance feedback. | No final turn present, so closer/commitment cannot be satisfied.

### Ahmed (ahmed-growth-career-plan.json)
- Meeting type: Growth & career plan
- Judge score: 1/5 (fail)
- Evidence: The provided transcript is empty and final_turn_check shows no final turn. As a result, there are no questions or flow to evaluate against the meeting type, and stage_coverage remains unmatched across all five stages.
- Flags: Transcript is empty. | No final/closer turn to assess. | Preparation brief appears mismatched to a workload/delegation check-in rather than a growth & career plan, but the score is driven by the absence of session content.

## Watch list

### Tom (tom-performance-feedback.json)
- Judge score: 3/5
- Evidence: The opener fits well: 'Before I share my view, how do you think the last stretch has gone?' The session surfaces the core issue clearly: fuzzy Principal bar, staying in lane, safe execution. However, 'What's something from the last quarter you're genuinely proud of' does not actually elicit concrete evidence, and the manager never plainly names their own assessment of the gap. The close is a real commitment, but it is process-focused ('write down the decision rule') rather than the concrete behavioral change this meeting type calls for.
- Flags: Manager view never lands explicitly; conversation stays mostly in employee self-assessment. | Evidence questions do not anchor on specific incidents, decisions, or cross-team moments. | Gap naming is underpowered because the manager does not plainly state the Principal-scope gap. | Commitment lacks a dated behavioral change tied to earlier expectation alignment or cross-team judgment.

