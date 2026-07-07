# Phase 2 — Queue-shape gates

**Part of:** [PLAN.md](plan.md) · **Status:** 🔨 built, awaiting product-owner walk

## Build note — dangling ref_alias (deviation from the plan, reasoned)
The plan listed "dangling ref_alias → **drop**". On reading the code, `reconcileQueue` **already enforces the intent, more safely**: a non-null `ref_alias` that isn't in the remaining queue is logged and the item is **re-validated as a brand-new question** (fresh alias, `source: planner_added`) — it must pass name-shape, repeat, eligibility, arc, and grounding gates on its own. So a hallucinated alias can never carry a real question's identity forward. A hard *drop* would be strictly worse: it would bin good reworded questions where the model merely mangled the alias but wrote valid, grounded text. **Decision: keep the sanitize-to-new recovery; do not add a destructive drop.** (Same shape as "description stays" and "clamp/relational already in code".) If Carl prefers a hard drop, it's a one-line change — flagged for his call.

## Goal
The queue as a whole obeys the budget and arc contract: it's never longer than the budget allows, the final turn always leads with the reserved closer, and no item points at an alias that isn't actually in the remaining queue.

## Where
- [backend/engine/queue-manager.ts](../../../backend/engine/queue-manager.ts) — the `planTurn()` gate sequence (~L352–390, after `reconcileQueue`, alongside `enforceThreadFollow` / `enforceDrillCap` / `enforceAxisCoverage`). New gates slot into this same sequence.
- New mirrored test: `backend/engine/queue-manager.test.ts` (node:test). None exists today — this phase adds the first direct unit coverage for the gate functions (keep them as exported pure helpers so they're testable without an API call).

## Changes
- **Budget-length gate** — enforce `len(new_queue) <= remaining_budget + 1`; and when `remaining_budget <= 2`, enforce `len(new_queue) == remaining_budget` (truncate the tail, keeping the highest-priority items = front of the queue). Log any truncation.
- **Closer-on-final-turn gate** — when `is_final_turn` (or `remaining_budget == 1`) and `closer_alias != "(none)"`: ensure `new_queue[0].ref_alias == closer_alias`. If the closer is present but not first, reorder it to front; if it's missing entirely, pull it from the remaining queue to front. Log the correction.
- **Dangling ref_alias drop** — any item whose non-null `ref_alias` does not appear in the remaining-queue input is dropped (the prompt's `<rules>` already forbids this; make it a hard drop). Log it.
- **Regression tests locking existing gates** — add tests asserting the *already-built* behaviour so it can't silently regress: (a) a `competency` item in a check_in / something_off meeting is dropped ([reconcile-queue.ts](../../../backend/engine/reconcile-queue.ts) relational-arc gate); (b) a delta on an axis outside the last question's signature is clamped out (`clampToSignature`, queue-manager.ts).

## Not in this phase
- Per-item shape validation (Phase 1).
- Note-tag stripping (Phase 3).
- No changes to thread-follow / drill-cap / coverage logic — only *new* gates plus regression tests around existing ones.

## Done when
- [ ] `queue-manager.ts` applies the three new gates in the gate sequence, each logging an issue string when it fires.
- [ ] `queue-manager.test.ts` covers: over-budget queue truncated; `remaining_budget=2` forces exactly 2 items; final turn puts closer_alias first (both reorder and pull-from-remaining cases); dangling ref_alias dropped; + the two regression tests (relational competency drop, off-signature clamp).
- [ ] `npm test` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **Unit tests pass** — run `npm test`. The new `queue-manager` gate tests (budget, closer, dangling ref, + the two regression tests) are listed and green. ❌ Not OK if any fail.
2. **Final turn ends on the closer** — replay a full fixture session (free, `--fixtures-only`) and open it in the admin console. The **last** question asked should be the reserved closer, phrased open/invitational (not a checklist stop). ❌ Not OK if the session ends on a random drill instead of the closer.
3. **Queue never overruns the budget** — in that same replay, at the final couple of turns the remaining queue shouldn't balloon with extra questions. ❌ Not OK if turn 7 of 8 still queues 4+ new questions.
4. **Check-in stays relational** — replay a `check_in` scenario; no question in it should read like a competency/performance audit. ❌ Not OK if a "prove you did X" competency question appears.
