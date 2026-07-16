# Phase 1 — Saturation early-close (Balanced, floor 4)

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
On the live web 1:1, once the answers have covered the whole picture (and it's turn 4+), move to the closing question and end — instead of running the full arc. Thin / still-opening conversations are untouched.

## Changes
- **`backend/api/services/sessions/session-streams.ts`** (`planStream`): after the answered turn is recorded, add one guarded check — if saturated, set `session.totalBudget = turn + 1`. The existing closer force-insert + done-gate then wrap the run with the closer as the last question. (Import the coverage/arc helpers, which aren't imported here today.)
- **A small saturation helper** (co-located, e.g. `backend/engine/saturation.ts` + mirrored test): pure function `isSaturated({ turn, axisState, transcript, arc, closerAlias, askedAliases })` → boolean. Keeps the rule testable in isolation and easy to tune.
- The rule (Balanced, v1): return true only when **all** hold —
  1. `turn >= 4` (the floor — never wrap before Q4),
  2. every axis has at least one **substantive** (non-shallow) touch — the briefing has signal across the whole picture,
  3. the just-answered turn was **not** shallow (don't wrap on a weak final note),
  4. the reserved closer exists and hasn't been asked yet.

## Not in this phase
- Tuning the eagerness / changing the signal (that's Phase 2, driven by Carl's real-run QA).
- Any planner/model-judged saturation (parked).
- CLI parity (parked).

## Done when
- [ ] `isSaturated` unit test: passes for a covered turn-5 state, false for turn-3 (floor), false when an axis is untouched, false on a shallow last answer.
- [ ] Driven on the real running app: a rich bi-weekly ends with the closer around Q4–5 (verify the session snapshot — `totalBudget` shrinks to `turn+1` and the transcript ends on the closer), and a thin bi-weekly still runs full length.
- [ ] `npm test` green (new test + regression) and `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk these yourself on the dev app (I'll have it running + tell you exactly where to click). Next phase waits for your green light.

1. **Rich conversation ends early** — start a **bi-weekly**, give full, specific answers covering how you're doing, what's snagging, and what's moving (4-ish strong answers). You should see it move to a wrap-up / "how can I help" question **around Q4–5** and finish, with a briefing that still feels complete. ❌ Not OK if it ends before Q4, or the briefing is missing a whole area.
2. **Thin conversation is NOT cut early** — start a **bi-weekly**, answer everything weakly ("fine", "ok", "dunno"). You should see it behave like today — it keeps going / offers to reschedule, it does **not** wrap early just because answers are short. ❌ Not OK if weak answers trigger an early finish.
3. **Half-covered runs full** — start a **bi-weekly**, give good answers on *one* area but leave others thin. You should see it keep asking to cover the gaps, running the normal length, closer last. ❌ Not OK if it ends while an area's still uncovered.
4. **Growth stays deep** — start a **growth** 1:1, answer normally. It should still run its longer arc (up to 9), not get truncated early on a couple of good answers. ❌ Not OK if a deep career chat wraps up short.
5. **Back button is safe** — after a run wraps early, use the step-back once. The conversation should reopen the previous turn cleanly with no stuck/finished state. ❌ Not OK if it jams or won't continue.
