# Active workstreams

Shared board. See `HANDOFF.md` for edit rules.

Statuses: `planning` | `in-progress` | `blocked` | `review` | `done`

---

## Logs tracked in git
- **Owner**: light-ops
- **Status**: done
- **Last touched**: 2026-05-23, light-ops
- **Next step**: —
- **Notes**: commit `90d7b0d` — dropped `logs/` from `.gitignore`, committed 1347 files.

## Pipeline run review workflow
- **Owner**: work-machine
- **Status**: planning
- **Last touched**: 2026-05-23, light-ops (seeded)
- **Next step**: work-machine to define what `reviewrun` skill should produce + how it shapes next iteration.
- **Notes**: skill exists; needs intent + output format spec.

## Feedback backlog → ready for next test run
- **Owner**: work-machine
- **Status**: review
- **Last touched**: 2026-05-30, light-ops (Batch H refresh vs audit v9)
- **Next step**: choose Batch I (FX-11/12 wind-down) or M1 Priya smoke (FX-44 verify), then execute.
- **Notes**: Full audit of 13 memory feedback items + 4 new log comments in this conversation's review.
  - ✅ Done by light-ops this turn: item 4 (coreIssue → one sentence ≤28 words, `prompts/preparation.md`).
  - 🟢 Already in place: items 1, 3, 5, 6, 8, 11, 13 (plan format, focus-points unselected default, no-restate-question, promise/snap-back, notes alias+stem, axis seeds, UI canon).
  - 🟡 Partial: item 7 (wind-down — only fires at budget=1; needs 2-turn taper), item 9 (briefing typography — no 2-col layout, questioning text default size), item 10 (`watch_for` → "Reminders" relabel only; contract + copy-paste affordance missing).
  - ✅ New-from-logs items now landed in audit v9:
    - N1 fixed (FX-33): duplicate focus-points header removed.
    - N2 fixed (FX-01/02): growth opener cleanup.
    - N3 fixed (FX-34): Complete 1:1 routes with scope-aware lexicon skip.
    - N4 fixed (FX-19/20): focus-point reason voice tightened.

## Adopt batch-run learnings (May 24)
- **Owner**: heavy-ops
- **Status**: review
- **Last touched**: 2026-05-30, light-ops (Batch H refresh)
- **Next step**: run Batch M verification for FX-44 (re-run against May-24 baseline) and decide whether to add worst-case regression fixtures.
- **Notes**: archive at `logs/may/2026_May24_batch/`. Source was `batch-data.zip` from work-computer eval+self-edit harness (26 runs, $12.61, score 0.820→0.839). `EVOLVED-DIFF.md` shows the three hunks applied:
  - `generate-questions.md` +persona-grounding rule (targets `question_specificity` 0.094).
  - `plan-turn.md` +thread-follow bias (targets `plan_thread_follow` 0.308).
  - `plan-turn.md` +anti-neutral-default calibration (targets `plan_delta_accuracy` 0.595).
  Worst-case `run_id`s for regression candidates are in `quality-report.json` → `worst_dimensions`. Full per-run corpus in `run-outputs.json`.

## Drill cap runtime enforcement (May 25 run finding)
- **Owner**: heavy-ops
- **Status**: planning
- **Last touched**: 2026-05-27, light-ops (seeded from `/reviewrun logs/may/2026_May25_14-23-5252887f`)
- **Next step**: heavy-ops to decide whether `src/queue-manager.js` should hard-enforce drill cap (strip planner_added+same-stage items from `new_queue` when `consecutive_drill_count >= 2`) or just keep relying on prompt rule.
- **Notes**: run 2026_May25_14-23 had 4 consecutive `planner_added` friction probes (turns 4,6,7,8). Cap rule exists in `prompts/plan-turn.md` (line 18 `Drill cap (hard)` + line 263 wellbeing-cap) and `computeConsecutiveDrillCount` in `src/queue-manager.js:73` is correct. Model ignored the hard rule. Prompt-side reinforcement alone may not be enough — runtime guardrail would be definitive. Touches contested file, so light-ops did not edit.

## Lexicon-review empty-state fix
- **Owner**: heavy-ops
- **Status**: planning
- **Last touched**: 2026-05-27, light-ops (seeded)
- **Next step**: heavy-ops to choose path: (a) gate UI so lexicon stage is hidden when `suggestions.length === 0`, (b) loosen reviewer filter for short/shallow runs, or (c) fix copy. User flagged twice ("again this feels like this feature is not working", run 2026_May25_14-23 notes.md).
- **Notes**: reviewer at `src/lexicon/review-core.js:71` returns `{suggestions: []}` cleanly when model finds nothing — that's expected behaviour. Frontend currently still shows the stage with "No lexicon candidates from this run." copy, which reads as broken to the user. Likely 2-file touch (backend gate + frontend conditional).

## Eval shallow-gate enforcement (DONE light-ops 2026-05-27)
- **Owner**: light-ops
- **Status**: done
- **Last touched**: 2026-05-27, light-ops
- **Next step**: —
- **Notes**: added `<read_quality_gate>` block at top of `prompts/final-evaluation.md` system section (computed first, before any field). Added partial-read precedence example to `<headline_rule>` so model knows the partial-read template wins over content-diagnosis when shallow_count >= 3. Triggered by run 2026_May25_14-23 where eval ignored its own shallow gate and diagnosed Carl as low-clarity from 4/8 shallow answers.

## Preparation validator retry (DONE light-ops 2026-05-27)
- **Owner**: light-ops
- **Status**: done
- **Last touched**: 2026-05-27, light-ops
- **Next step**: —
- **Notes**: `src/preparation.js` now retries 1x with validation issues injected into the user prompt when `validation.passed === false`. Takes the retry if it passes OR reduces issue count. Logs `attempts` in stage inputs. Cost: 1 extra `gpt-4o` preparation call on failure path only. Triggered by run 2026_May25_14-23 where briefing shipped with 5 validation issues unaddressed.

## Remaining backlog (post audit v9)
- **Owner**: either machine (batch-dependent)
- **Status**: in-progress
- **Last touched**: 2026-05-30, light-ops (Batch H execution)
- **Next step**: finish Batch H checklist (LF-2/3/4 audit flips, Carl schema fix, housekeeping-only commit), then move to Batch I or M.
- **Notes**: Master ID table stays in `plans/log-fix-audit.md` (v9: 64 done, 21 open). Consolidated sequence + batches in **`plans/remaining-backlog.md`**. Suggested order: H → I/J → M (FX-44 verify) → L (lexicon) → K (axes) → M (regression) → N (deferred).
