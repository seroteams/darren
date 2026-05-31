# Active workstreams

Workstream board.

Statuses: `planning` | `in-progress` | `blocked` | `review` | `done`

---

## Logs tracked in git
- **Status**: done
- **Last touched**: 2026-05-23
- **Next step**: —
- **Notes**: commit `90d7b0d` — dropped `logs/` from `.gitignore`, committed 1347 files.

## Pipeline run review workflow
- **Status**: planning
- **Last touched**: 2026-05-23 (seeded)
- **Next step**: define what `reviewrun` skill should produce + how it shapes next iteration.
- **Notes**: skill exists; needs intent + output format spec.

## Feedback backlog → ready for next test run
- **Status**: review
- **Last touched**: 2026-05-30 (Batch H refresh vs audit v9)
- **Next step**: Batch N (deferred) or optional M5 live replay.
- **Notes**: Full audit of 13 memory feedback items + 4 new log comments in this conversation's review.
  - ✅ Done this turn: item 4 (coreIssue → one sentence ≤28 words, `prompts/preparation.md`).
  - 🟢 Already in place: items 1, 3, 5, 6, 8, 11, 13 (plan format, focus-points unselected default, no-restate-question, promise/snap-back, notes alias+stem, axis seeds, UI canon).
  - ✅ Done Batch I (2026-05-30): item 7 wind-down 2-turn taper (FX-11), late closer open phrasing (FX-12) — `prompts/plan-turn.md`.
  - ✅ Done Batch J (2026-05-30): item 9 briefing typography + 2-col layout (FX-25), item 10 reminders copy-paste (FX-24), questioning text size (FX-32).
  - ✅ New-from-logs items now landed in audit v9:
    - N1 fixed (FX-33): duplicate focus-points header removed.
    - N2 fixed (FX-01/02): growth opener cleanup.
    - N3 fixed (FX-34): Complete 1:1 routes with scope-aware lexicon skip.
    - N4 fixed (FX-19/20): focus-point reason voice tightened.

## Adopt batch-run learnings (May 24)
- **Status**: done
- **Last touched**: 2026-05-30 (Batch M1)
- **Next step**: —
- **Notes**: M1 verified via `scripts/batch-m1-verify.js`. Prompt hunks present; proxy Toby run (May24) beat baseline on qspec (0.778 vs 0.094), thread (0.571 vs 0.308), delta (0.875 vs 0.595). Full 10-scenario `--live` sweep optional follow-up when API key available. Report: `logs/may/2026_May24_batch/m1-rerun-report.json`.

## Drill cap runtime enforcement (May 25 run finding)
- **Status**: planning
- **Last touched**: 2026-05-27 (seeded from `/reviewrun logs/may/2026_May25_14-23-5252887f`)
- **Next step**: decide whether `src/queue-manager.js` should hard-enforce drill cap (strip planner_added+same-stage items from `new_queue` when `consecutive_drill_count >= 2`) or just keep relying on prompt rule.
- **Notes**: run 2026_May25_14-23 had 4 consecutive `planner_added` friction probes (turns 4,6,7,8). Cap rule exists in `prompts/plan-turn.md` (line 18 `Drill cap (hard)` + line 263 wellbeing-cap) and `computeConsecutiveDrillCount` in `src/queue-manager.js:73` is correct. Model ignored the hard rule. Prompt-side reinforcement alone may not be enough — runtime guardrail would be definitive.

## Lexicon-review empty-state fix
- **Status**: done
- **Last touched**: 2026-05-30 (Batch L)
- **Next step**: —
- **Notes**: Batch L fixed root cause (Expert seniority excluded from `shouldReview`) + FX-40 copy path. Toby growth live run returns 6 candidates. Carl bi-weekly correctly skips lexicon at briefing. Verify: `node scripts/batch-l-verify.js`.

## Eval shallow-gate enforcement (done 2026-05-27)
- **Status**: done
- **Last touched**: 2026-05-27
- **Next step**: —
- **Notes**: added `<read_quality_gate>` block at top of `prompts/final-evaluation.md` system section (computed first, before any field). Added partial-read precedence example to `<headline_rule>` so model knows the partial-read template wins over content-diagnosis when shallow_count >= 3. Triggered by run 2026_May25_14-23 where eval ignored its own shallow gate and diagnosed Carl as low-clarity from 4/8 shallow answers.

## Preparation validator retry (done 2026-05-27)
- **Status**: done
- **Last touched**: 2026-05-27
- **Next step**: —
- **Notes**: `src/preparation.js` now retries 1x with validation issues injected into the user prompt when `validation.passed === false`. Takes the retry if it passes OR reduces issue count. Logs `attempts` in stage inputs. Cost: 1 extra `gpt-4o` preparation call on failure path only. Triggered by run 2026_May25_14-23 where briefing shipped with 5 validation issues unaddressed.

## Remaining backlog (post audit v16 / M2)
- **Status**: in-progress
- **Last touched**: 2026-05-30 (Batch M2 live sweep)
- **Next step**: Batch N (deferred) or optional M5 live replay.
- **Notes**: Master ID table stays in `plans/log-fix-audit.md` (v16: 83 done, 7 open). M2 live: 10/10 personas; qspec 0.951, thread 0.473, delta 0.988, overall 0.804 — target dims beat baseline, thread follow still the gap vs predicted ranges. Report: `logs/may/2026_May24_batch/m2-comparison-report.json`.

## Split 1:1 Types into self-contained folders (refactor)
- **Status**: done
- **Last touched**: 2026-05-31
- **Next step**: optional — Phase 3 (per-Type scoring/planner knobs) when a concrete divergence goal exists; Onboarding openers + intro seeds for production polish.
- **Notes**: branch `refactor/one-on-one-types` (PR #1). New `src/one-on-one-types/` registry (`getType`/`listTypes`/`promptFor`, shared-prompt fallback); each Type owns `<slug>/type.js`; `meeting-arcs.js` now a back-compat shim; Growth forks its own `final-evaluation.md`; 5th Type "Onboarding check-in" added via the recipe. All six stage runners resolve prompts per-Type (commit `92bbf4e`). `getArc`/`listStageIds`/`MEETING_ARCS` preserved; `test-opener-routing` + `test-lexicon` PASS. Full phase log: `plans/split-arcs-into-flows.md`.
