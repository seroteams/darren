# Phase 2 — The rewrite

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-10 — slim to 9,186 tok worst-case, npm test 109/109, every rule preserved

## Built (2026-07-10)
Slimmed [content/prompts/plan-turn.md](../../../../content/prompts/plan-turn.md) System block **9,823 → ~5,900 tok** and compacted the User-block JSON in [backend/engine/messages.ts](../../../../backend/engine/messages.ts) (`, null, 2` dropped from 13 data blocks). Every rule preserved — cross-referenced duplication consolidated, code-netted prose compressed, one worked example + 3 weak/sharp rows trimmed. Nothing removed that lacks a code net *or* is a prompt-only rule (those were tightened, not cut).

**Result — new filled prompt sizes (o200k_base, via updated size report):**
| Scenario | Worst turn (was) | Now |
|---|---|---|
| bi-weekly | 13,585 | 9,032 |
| feels-off | 13,311 | 8,774 |
| performance | 13,739 | **9,186** |

Worst case **9,186 tok** — under the 9,300 target, ~316 below the proven-caching point (9,502), comfortably under the ~9,600 cliff. Every turn now caches.

**Offline checks (free):** `npm test` **109/109** (incl. queue-manager, reconcile-queue, cassette assembly) · `npm run typecheck` clean · placeholder set **identical to HEAD** · 16/16 section tags balanced · System/User split intact.

Per-section before→after: assessment_rules 2207→1124 · planning_rules 2079→1311 · question_craft 1579→829 · thread_follow 991→577 · output_contract 509→~370 · worked_examples 395→168 · wind_down 372→192 · others lightly tightened (crisis_override kept near-full for safety).

---

**Status (original):** ⬜

## Goal
Apply the approved cut list to plan-turn.md so every assembled prompt measures ≤9.3k tokens, with all offline checks green.

## Changes
- Edit [content/prompts/plan-turn.md](../../../../content/prompts/plan-turn.md) per the phase-1 cut list — nothing beyond it. (Companion notes file plan-turn.notes.yaml updated if it mirrors cut text.)
- Compact the User-block JSON in [backend/engine/messages.ts](../../../../backend/engine/messages.ts): drop the pretty-print indent (`JSON.stringify(x)` not `, null, 2`) for the large data blocks. Formatting only — no field changes, same values. ~450 tok saved.
- Re-run the phase-1 size report to prove the target is met on every logged turn.
- Full offline suite: `npm test`, `npm run typecheck`, cassette/fixtures replay still green.

## Not in this phase
- No cuts that weren't on the approved list — if the target can't be met without more, stop and bring the extra candidates back for approval.
- No schema changes, and no changes to planner gate *logic* (the messages.ts change is JSON formatting only, not a gate).
- No paid runs — live behavior is phase 3's job.

## Done when
- [ ] Size report: every turn of every logged scenario ≤9.3k tokens.
- [ ] `npm test` and `npm run typecheck` green; placeholder-fill asserts still pass (no orphaned `{{PLACEHOLDERS}}` left behind).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Under budget** — run `node scripts/plan-turn-size-report.js`. Every row should now show ≤9.3k tokens (was ~13k). ❌ Not OK if any turn is over.
2. **Nothing obviously missing** — open the slimmed plan-turn.md and skim the System section. The persona, crisis handling, no-inference rules, and question-craft principles should still read as complete thoughts. ❌ Not OK if any section reads like it was chopped mid-rule.
3. **Suite green** — run `npm test`. Should pass same as before this phase (two known environmental failures in fresh worktrees don't count). ❌ Not OK if a planner/queue test broke.
