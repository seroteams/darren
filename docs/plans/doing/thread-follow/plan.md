# Thread-follow — make the engine follow the person, not just its queue

**Goal:** when someone volunteers a new thread in a 1:1 ("I still want to mentor, but I stopped pushing"), the very next question picks it up — instead of the coverage engine / drill cap marching the pre-planned queue over it.
**Driver:** Carl
**Created:** 2026-07-09

## Why now
The 8–9 Jul night-test deep reads scored **thread-following 55–65/100 on every run** — the one systemic weak muscle. Concrete misses that night:
- **Priya** volunteered mentoring; two ready-made mentoring questions sat unused and it never got asked.
- **Tom**: three late coverage-seeds on wellbeing yielded zero signal while two live threads (adjacent-team trust, visible ownership) were parked.
- **James**: the manager's #3 priority (mentoring fit) had a queued question evicted unasked.

Baseline metric (captured free from last night's gate rolls — no new spend): `plan_thread_follow` = **0.125** (priya) · **0.25** (tom) · **0.43** (james).

## Root cause (from reading the code)
The per-turn planner returns a queue, then a fixed pipeline of gates rewrites it, in this order (`backend/engine/queue-manager.ts:414-463`):

`reconcile → thread-follow → drill-cap → axis-coverage → closer → budget`

Two independent bugs fall out of that:
1. **Thread-follow runs first and only *prepends*; drill-cap (next) can drop it.** Coverage already protects a runtime thread-follow at slot 0 (`axis-coverage.ts:93` `insertAt`), but **drill-cap does not** (`queue-manager.ts:210-222` can slice slot 0 or shove another candidate ahead of it).
2. **Thread-follow never even mints under pressure.** It bails when `consecutiveDrillCount >= 2` or `remainingBudget <= 2` (`thread-follow.ts:101-102`) — i.e. exactly when someone keeps opening up on a topic (which *looks* like drilling), the engine stops following.

## Done means
- When a person opens a genuine new thread, the next question is about that thread — visible in a run walk / replay.
- The `plan_thread_follow` metric moves up meaningfully on the gate cases **without** regressing any leakage or coverage hard-fail.
- The honesty guarantees the gates encode (drill cap stops over-drilling one point; coverage still gets every axis read) are preserved — proven by their tests staying green.

## Resolved before we start
- **Baseline is already in hand, free** — last night's gate rolls captured the three `plan_thread_follow` numbers above. No new baseline run needed.
- Coverage's existing `insertAt` guard (`axis-coverage.ts:93`) is the exact pattern Phase 1 mirrors into drill-cap.
- The metric is defined in `scripts/lib/session-scores.ts` (`scoreThreadFollow`) — it only credits a `planner_added` follow-up that shares a >4-char word with the prior answer.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Pin the follow-up | Drill-cap (and the queue-shape gates) treat a runtime thread-follow at slot 0 as pinned — a minted follow can't be dropped. Deterministic; proven free. | ✅ |
| 2 | Let it mint under pressure | Relax the early-bail so a *genuine new thread* still mints when the person has been opening up — while keeping the drill cap for true same-point over-drilling. Proven with ONE paid gate case. | 🔨 proven, awaiting green light |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ green-lit 2026-07-09** (Carl's "A", accepting the deterministic test as proof). The drill-cap pin landed in `queue-manager.ts` + 2 test locks; full suite 105/105; my files typecheck clean. Honest note carried into phase-1.md: Phase 1 changes no existing run's output — it's load-bearing groundwork that only pays off once Phase 2 lets a follow mint under drill pressure.
**Phase 2 🔨 built + PAID-PROVEN 2026-07-11, committed — awaiting Carl's green light to close.** The relaxed bail alone wasn't enough: roll 1 (0/8) exposed that the builder's canned "can you say more" stem was the exact phrase the validator bans on substantive answers — the runtime mint could NEVER fire. Fixed test-first (grounded quoted stem + a validator backstop that keeps fake quotes impossible; validator NOT weakened). Roll 2: **`plan_thread_follow` 0.125 → 0.43 (3/7), verdict PASS, zero hard-fails/warnings** — the mentoring thread finally followed on priya. Suite 118/118. Full story in [phase-2.md](phase-2.md). ~$0.70 total paid spend.

## Parked
- Broadening the metric itself (`scoreThreadFollow` only credits `planner_added` follows, so genuine follows via other sources score zero — the raw number understates true coherence). Measurement change, separate from the engine fix; revisit only if the numbers stay muddy after Phase 2.
- The other night-test engine findings (private-plan bank filter, closer-gate robustness, EVIDENCE_ANCHOR flakiness) stay parked in their own triage — not this track.
