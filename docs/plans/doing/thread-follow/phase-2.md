# Phase 2 — Let a genuine new thread mint under pressure

**Part of:** [plan.md](plan.md) · **Status:** 🔨 built + PAID-PROVEN 2026-07-11 (committed) — awaiting Carl's green light to close

## Built (2026-07-09)
- `backend/engine/thread-follow.ts` — replaced the blanket `consecutiveDrillCount >= 2` bail with `isRuntimeThreadFollow(lastQuestion)`: a genuine new thread now earns ONE follow even under drill pressure, but a follow is never chained onto another follow (that would stall the arc). Removed the now-unused `consecutiveDrillCount` param (and from the `enforceThreadFollow` call in `queue-manager.ts`).
- `backend/engine/queue-manager.test.ts` — 2 disk-free locks (red→green): a new thread reaches the builder under drill pressure; a follow is never chained onto a follow.
- Proof (free): full suite **106/106**, lint **0/0**, my files typecheck clean.

## ⛔ Paid metric proof BLOCKED (not my change)
The one paid gate case can't run: `scripts/gate.js` → `smoke-test.js` crashes in pre-flight with
`arc-overlay cache not hydrated — await hydrateArcOverlays() at boot (postgres-runtime-data Phase 5)`.
That's the parallel session's committed `14d1b971` (P5c — arc overlays moved to the DB, boot-hydrated) — it wired `hydrateArcOverlays()` into `server.ts` + `cli.ts` but **not into the offline gate/smoke path**, so the whole gate is down on `main`. The crash is in the unit-check pre-flight, **before any model call — $0 spent, the paid run was not consumed.**

**Phase 2 stays open (uncommitted) until the gate runs and shows `plan_thread_follow` moving up with no new leakage.** Options: (a) the postgres session wires hydration into the gate path, then re-run the one paid case; (b) run the case on a checkout without that commit. Code is done and unit-proven; only the live number is owed.

## 📈 PROVEN 2026-07-11 — metric 0.125 → 0.43, no new leakage (two paid rolls, ~$0.70 total)
**Roll 1 (0/8 — the honest failure that found the real bug).** The gate path was unblocked first (cache hydration wired into `smoke-test.js` + `gate.js` pre-flight, `671ded15`), then `gate.js --only biweekly-priya` (~$0.35) ran with this phase's code: verdict PASS, no leakage — but `plan_thread_follow` = **0.00 (0/8)**. Free diagnosis on the saved session found the root cause in the turn logs ("thread-follow skipped — no stem grounded"): **the runtime mint could never fire on any substantive answer.** The builder's only stem — "…can you say more about what that means…" — is the exact phrase `question-validator.ts` bans as a vague follow-up on substantive answers (`VAGUE_MORE`, added after the Jun 11 Machar run). `answerHasThread` requires a substantive answer; the validator rejected the canned stem on every substantive answer. Mutually exclusive by construction — the relaxed bail (this phase) let the mint path RUN, and the builder then died at validation every time.
**The fix (test-first, all free).** The builder now quotes the answer's own contiguous words and probes the cause — `You said "<span>" — what's behind that for you right now?` — matching the plan-turn prompt's "one focused probe" craft. The validator was NOT weakened: `VAGUE_MORE` still bans the old stem (locked in the new `question-validator.test.ts`), and a new `QUOTED_MIRROR` backstop rejects any `You said "…"` stem whose quote isn't the answer's contiguous words (the Jun 02 fake-quote shape stays impossible). New `thread-follow.test.ts` locks the mint on the three REAL answers from roll 1; the stale lock in `test-question-integrity.js` (which enshrined "skip on substantive" — the bug — as intended) now asserts the intent: grounded, never canned. Suite 118/118 · typecheck clean.
**Roll 2 (~$0.35): `plan_thread_follow` = 0.43 (3/7)** vs baseline **0.125 (1/8)** — verdict PASS, **zero hard-fails, zero warnings** (no new leakage), `question_specificity` 1.0 held. Read the follows in the transcript (`logs/july/2026_Jul11_07-34-…`): the runtime mint fired at turn 2 quoting the answer verbatim, and the planner itself followed the mentoring + similar-work threads at turns 4/6 — the exact "Priya's mentoring gets marched over" complaint from the 8–9 Jul night test, fixed and visible.
**Committed** per this file's own criterion (metric up, no new leakage). Close-out (phase-close ritual) waits on **Carl's green light**.

## Goal
Stop the engine going deaf exactly when the person is opening up. Today thread-follow bails the moment `consecutiveDrillCount >= 2` — but "the person keeps volunteering" looks identical to "we keep drilling one point." Tell the two apart: **follow a genuine NEW thread** even under drill pressure, while still capping true same-point over-drilling.

## Changes
- `backend/engine/thread-follow.ts` (101-104) — replace the blanket `consecutiveDrillCount >= 2` bail with a check that still mints when the last answer opens a **new** thread (a topic not already being drilled), and only suppresses when the follow-up would drill the *same* narrow point again. Keep the `remainingBudget <= 2` guard (near the end, no room) and the existing repeat/asked guards.
- Tests: `backend/engine/thread-follow.test.ts` (or wherever its unit tests live) — lock both directions: a new thread under drill pressure DOES mint; a same-point re-drill under pressure does NOT.

## Not in this phase
- The pinning fix (Phase 1) — assumed landed and green.
- Broadening the metric (`scoreThreadFollow`) — parked.

## Done when
- [ ] Unit tests lock both directions (new-thread mints; same-point re-drill suppressed).
- [ ] `npm test` green; `npm run typecheck` clean.
- [ ] **ONE paid gate case** (~$0.35, the smallest proof — e.g. `node scripts/gate.js --only performance-tom`, whose baseline was 0.25): `plan_thread_follow` moves up vs the last-night baseline **with zero new leakage/coverage hard-fails**. (Cost stated up front; second run needs Carl's explicit go.)
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for the product owner
Walk these yourself. All but #3 are free.
1. **New thread gets followed** — I show a unit case: the person opens a brand-new topic after we'd been drilling something else; the engine now mints a follow-up on the new topic. ❌ Not OK if it still bails.
2. **Over-drilling still capped** — I show the opposite case: the person keeps circling the *same* narrow point; the engine does NOT keep drilling it. ❌ Not OK if this now runs away drilling one thing.
3. **The number moves (one paid run, ~$0.35)** — one gate case: `plan_thread_follow` is higher than last night's baseline for that case, and no new leakage or coverage failure appears. ❌ Not OK if the metric is flat, or if any leakage/coverage hard-fail is now red.
