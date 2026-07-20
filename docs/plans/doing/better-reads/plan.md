# Better reads — fix scoring skew + briefing sameness

**Status:** Phase 1 in progress · Phases 2–3 waiting on green light
**Owner session:** 7d264f5e (2026-07-20)

## Why
July audit of all 5 engine stages: the deterministic scoring gates only ever push scores toward zero/negative (shallow gate zeroes ALL deltas on terse notes; no positive counterpart), the eval post-process erases strong single-touch reads, and the prep brief has no history so repeat bi-weeklies read near-identical. Net effect: the manager's read clusters flat/low and briefings feel same-y — both dilute the insight Sero is paid for.

Carl chose this track over the cost quick-wins on 2026-07-20. The cost quick-wins (prep-retry economics, question-bank waste cut, plan-turn cache lock) and housekeeping (blind-lint promotion, person-key migration, focus-prompt trim) stay parked in the audit backlog — do not fold them in here.

## Honesty rule (binding for every phase)
Gates may only **preserve or drop** model-proposed signal — never invent it. All changes surface what happened (issues/unbooked_signal/health), never rewrite model output.

## Phases
- **Phase 1 — Measure the skew (detect-only).** Instrument `applyShallowGate` to record zeroed deltas into `unbooked_signal` with reasons (`shallow_zeroed` / `shallow_zeroed_protect_eligible`); add `isTerseButConcrete`. Zero behaviour change to scores — replay must be zero-diff. **Note:** the planned `run-health.ts` `scoring` block is DEFERRED — that file sits in the promises-loop chat's lane (1b4b459f); Carl chose build-around on 2026-07-20. Phase 1's QA table is computed off existing logs instead.
- **Phase 2 — Arm the protect gate + single-touch recalibration.** Terse-but-concrete answers keep model-proposed positive deltas (still signature-clamped); |score|≥3 on one *quality-note* touch becomes read/low-confidence instead of not_read. Fixture diffs expected, listed, re-frozen deliberately. Touches `reviewer.ts` — needs the promises-loop lane cleared first.
- **Phase 3 — Prep freshness.** `prep-history.ts` mirroring promise-history (userId+personId fence, arc fence, brief fields only — no notes text); `{{PREP_HISTORY_BLOCK}}` in the User half of `content/prompts/preparation.md`. ONE paid eval ~$0.35 to prove repeats open new ground without worsening the validator's attempt-1 reject rate. Touches `content/prompts/` + `session-streams.ts` — also behind the promises-loop lane.

Full design + risks: see phase files.
