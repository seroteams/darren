# Adaptive early close — offer to wrap the 1:1 when the answers are enough

**Goal:** When the manager's answers have covered the ground, the 1:1 offers a clean choice — **Complete 1:1** (primary) or **Continue deeper** (secondary) — instead of always running the full question count. Complete wraps to the briefing; Continue deeper keeps going and digs into the issues the manager already raised.
**Driver:** Carl
**Created:** 2026-07-17

## The why (one paragraph)
Tester feedback, twice: *"we're pushing for [more] questions when less could have worked — based on the answers."* The earlier fix right-sized each meeting type's default (bi-weekly 6, growth 9), but a fixed number still marches to its count whether the answers earned it or not. This makes the engine **listen** — and, crucially, hands the manager the decision rather than ending on its own: once the ground's covered it says *"looks like we've got what we need"* and offers **Complete 1:1** / **Continue deeper**. On a thin or still-opening conversation nothing changes — the offer simply doesn't appear yet.

**Policy (Carl's pick):** *Balanced* — offer the wrap-up once the picture is clearly covered, but **never before question 4** (a floor), so it always feels complete, never abrupt. Fully tunable later.

## Done means
- When a bi-weekly's answers cover the whole picture (turn 4+), the manager sees a primary **Complete 1:1** button and a secondary **Continue deeper** button — instead of the run silently grinding on or ending itself.
- **Complete 1:1** → wraps to the briefing cleanly, and it still reads complete.
- **Continue deeper** → the 1:1 keeps going, and its follow-ups dig into the specific issues the manager already raised (Phase 2).
- A bi-weekly with thin / weak / "fine, dunno" answers does **not** get the offer early — it runs as today (incl. the reschedule offer).
- A run where the ground *isn't* yet covered by turn 4 keeps asking to fill the gaps — unchanged.
- Growth (and other longer types) still run their full length unless genuinely saturated; the floor is respected.
- Offline tests green, typecheck clean; the two-button moment renders correctly in the running app (screenshotted).

## Resolved before we start (dug out of the code)
- **Detection = coverage of the picture, not questions-asked.** Arc-stage coverage (`computeRemainingStages`) ≈ the budget itself, so it wouldn't shorten anything. The honest "enough" signal is **axis coverage**: every dimension the briefing needs has a real (non-shallow) answer behind it. Shallow answers are already zeroed (`applyShallowGate`), so a covered axis genuinely means substantive signal. Turn-4 is already the codebase's conventional floor (`axis-coverage.ts`).
- **The offer, not an auto-end.** At the saturation point the engine does NOT end on its own — it flags the served turn as an "offer to complete" the client reads to show the two buttons. Hook: `backend/api/services/sessions/session-streams.ts` → `planStream()`, right after the answered turn is pushed to the transcript (~line 434).
- **Complete reuses one lever.** The run is driven only by `session.totalBudget` (`turn >= totalBudget`, 3 sites, + `remainingBudget`). **Complete 1:1** sets `session.totalBudget = turn + 1` → the **existing** closer force-insert + done-gate wrap the run — no new terminal logic. **Continue deeper** just clears the offer and proceeds.
- **Both apps.** The two-button UI lands in the questioning screen of *both* front-ends — `admin/src/stages/questioning.js` and the frontend equivalent — styled per DESIGN.md (one blue/primary action = Complete, secondary = Continue deeper).
- **Back-nav safe.** The step-back snapshot already captures/restores `totalBudget`, so a Complete rolls back cleanly if the manager reverses.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Saturation + the choice | Detect coverage (floor 4) → offer **Complete 1:1** / **Continue deeper**; Complete → briefing, Continue → resumes normally | ⬜ |
| 2 | "Continue deeper" digs in | Continue's follow-ups drill into the specific issues the manager raised | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phases written, awaiting Carl's confirmation before any code. Nothing built yet. One phase at a time.
Baseline to run at the START of Phase 1 (free first): `npm test` + typecheck. (Known pre-existing: 2 `listenFor` regression fixtures unrelated to this work.)

## Parked
- **Planner-assisted saturation** — let the plan-turn model flag "enough" as a second opinion feeding the code check. Only if Phase 1's deterministic trigger proves too blunt.
- **CLI parity** — the CLI questioning loop (`questioning.ts`) is a dev-only tool; give it the same behaviour after the web path is proven. Low priority.
- **Per-type eagerness** — different floors/sensitivity per meeting type (e.g. growth more cautious). Revisit only if Carl's QA asks for it.
