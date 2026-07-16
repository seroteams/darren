# Adaptive early close — end the 1:1 when the answers are enough

**Goal:** A 1:1 wraps up early (with a proper closing question) once the manager's answers have already given enough for a strong briefing — instead of always running the full per-type question count.
**Driver:** Carl
**Created:** 2026-07-17

## The why (one paragraph)
Tester feedback, twice: *"we're pushing for [more] questions when less could have worked — based on the answers."* The earlier fix right-sized each meeting type's default (bi-weekly 6, growth 9), but a fixed number still marches to its count whether the answers earned it or not. This phase makes the engine **listen**: on a rich, complete conversation it moves to the closer early; on a thin or still-opening one it behaves exactly as today.

**Policy (Carl's pick):** *Balanced* — wrap once the picture is clearly covered, but **never end before question 4** (a floor), so it always feels complete, never abrupt. Fully tunable later.

## Done means
- A bi-weekly where the manager gives full, substantive answers across the whole picture ends with its closing question **around Q4–5**, and the briefing still reads complete.
- A bi-weekly with thin / weak / "fine, dunno" answers does **not** wrap early — it runs its normal length (today's behaviour, incl. the reschedule offer).
- A normal run where the ground *isn't* yet covered by turn 4 runs its full arc, closer last — unchanged.
- Growth (and other longer types) still run their full length unless genuinely saturated; the floor is respected.
- Offline tests green (new turn-loop saturation test + regression), typecheck clean.

## Resolved before we start (dug out of the code)
- **One lever, not a rewrite.** The whole run is driven by `session.totalBudget`, read only as `turn >= totalBudget` (3 sites) + `remainingBudget = totalBudget - turn`. Setting `session.totalBudget = turn + 1` at the saturation point makes the **existing** closer force-insert fire this turn and the **existing** done-gate end the run next turn — no new terminal logic.
- **Hook point:** `backend/api/services/sessions/session-streams.ts` → `planStream()`, right after the answered turn is pushed to the transcript and before the closer force-insert block (~line 434). Precedent: the agenda carry-forward already mutates `totalBudget` mid-loop here.
- **Signal = coverage of the picture, not questions-asked.** Arc-stage coverage (`computeRemainingStages`) ≈ the budget itself, so it wouldn't shorten anything. The honest "enough" signal is **axis coverage**: every dimension the briefing needs has a real (non-shallow) answer behind it. Shallow answers are already zeroed (`applyShallowGate`), so a covered axis genuinely means substantive signal. Turn-4 is already the codebase's conventional floor (`axis-coverage.ts`).
- **Back-nav safe.** The step-back snapshot already captures/restores `totalBudget`, so an early end rolls back cleanly if the manager reverses a turn.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Saturation early-close (Balanced, floor 4) | The mechanism + first trigger, live web path | ⬜ |
| 2 | Tune from Carl's real-run QA | Adjust eagerness / signal; optional planner assist | ⬜ (shaped after Phase 1 green light) |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 written, awaiting Carl's confirmation of the plan before any code. Nothing built yet.
Baseline to run at the START of Phase 1 (free first): `npm test` + typecheck. (Known pre-existing: 2 `listenFor` regression fixtures unrelated to this work.)

## Parked
- **Planner-assisted saturation** — let the plan-turn model flag "enough" as a second opinion feeding the code check. Only if Phase 1's deterministic trigger proves too blunt.
- **CLI parity** — the CLI questioning loop (`questioning.ts`) is a dev-only tool; give it the same early-close after the web path is proven. Low priority.
- **Per-type eagerness** — different floors/sensitivity per meeting type (e.g. growth more cautious). Revisit only if Carl's QA asks for it.
