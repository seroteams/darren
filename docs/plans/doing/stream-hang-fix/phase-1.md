# Phase 1 — The prep screen can never wait forever

**Part of:** [plan.md](plan.md) · **Status:** ✅ done (tested)

## ✅ GREEN-LIT 2026-07-17 — Carl walked the stall + the normal brief ("tested good") (commit 21d2d714)

## Built (2026-07-17)
- `shared/sse.js` — 60s watchdog (`STALL_MS`). Armed in `open()`, cleared by any non-`thinking` event and by `close()`. Fires an honest, retryable payload (`{ message, timeout: true, recoverable: true }`) through the consumer's `error` handler, falling back to `onError`. All 10 `openSse` call sites covered.
- `scripts/run-tests.js` (47-52) — now scans `shared/`. Without this the new test silently never ran.
- `backend/api/handlers/stream-helper.ts` — `shouldStall()` + `stallForever()`, the dev-only `SERO_STALL_STAGE` switch. Hard-gated on `NODE_ENV !== "production"`.
- **New tests:** `shared/sse.test.ts` (6) — fake EventSource + mock timers; `backend/api/handlers/stream-helper.test.ts` (3) — the switch is inert in production.

**Offline proof:** red first (3 watchdog tests failed, the 3 no-false-alarm guards passed), then green. `npm test` **153/153**, `npx tsc --noEmit` clean. *(Baseline was 150; +2 mine, +1 `briefing-structure.test.ts` committed by a parallel session mid-work.)*

**Seen on the real screen** (isolated server pair, ports 3091/3093 — did not disturb the running dev stack):
- Stall armed → error card **fired at 62s** with "Retry this step" → `shots/71-stall-error-card.png`
- Stall off → brief **landed at 12s**, no false alarm, renders fully → `shots/72-happy-brief.png`

**Honest caveats:**
1. The error card shows its **generic** copy ("Something went wrong on this step") — `admin/src/stages/error.ts:16` hardcodes that line and puts the real message ("This is taking longer than usual…") inside the collapsed *Technical details*. Pre-existing design, not introduced here. Phase 1's goal is met (no infinite spinner, Retry offered), but the timeout wording is one click away rather than on the card. **Parked as a copy decision for Carl** — not silently changed.
2. **The walk is not free** (I said £0 in the plan — wrong). The switch only replaces the *brief* call. Reaching the brief still generates the role profile + focus areas, so each walk costs **a few pence** (~$0.05–0.10), not nothing. The expensive part is replaced; the walk-up isn't.

## Goal
If the prep brief gets stuck, Sero tells the manager within 60 seconds and offers a Retry — instead of a spinner that never ends.

## Changes
- `shared/sse.js` — a 60-second watchdog. Armed when the stream opens, cleared by the first real message and by close. If only "thinking" ever arrives, it fires the existing error path. Lands in the shared wrapper so **all ten** streaming screens get it, not just the brief.
- `scripts/run-tests.js` (46-52) — also look for tests in `shared/`. Without this the new test silently never runs.
- `backend/api/handlers/stream-helper.ts` — a dev-only `SERO_STALL_STAGE` switch that makes a stage hang on purpose, so this is walkable. Off in production. **Replaces the AI call, so walking it costs $0.**

## Not in this phase
- The server-side fixes (waiting screens being left un-told) — that's Phase 2.
- The render-crash case — Phase 3.
- Auto-reconnect, the logo — parked, see plan.md.

## Done when
- [ ] `shared/sse.test.ts` exists and **actually runs** in `npm test` (prove it: the count rises from 150).
- [ ] Watchdog fires at 60s of thinking-only; does NOT fire when a result arrives (even at 120s); "thinking" does not reset it; a closed stream can't fire it.
- [ ] `SERO_STALL_STAGE` is inert when `NODE_ENV=production` (test proves it).
- [ ] Seen on the real screen: with the switch on, the error card + Retry appears — screenshot taken, not inferred from code.
- [ ] Carl has walked the scenarios below and said go.

## Test scenarios — for Carl
Walk these yourself. Phase 2 waits for your green light. **Cost: a few pence per walk** — the switch replaces the expensive brief call, but getting to the brief still generates your focus areas.

1. **The stuck brief now speaks up.**
   Add `SERO_STALL_STAGE=preparation` to `.env`, restart Sero (*Start Sero.bat*), start a new 1:1 and go through to the prep brief.
   You should see: the skeleton, then at **60 seconds** the normal "We hit a snag" card with a **Retry** button.
   ❌ Not OK if: the spinner just keeps going past ~70s, or the error appears instantly/way too early.

2. **Normal briefs are untouched — no false alarms.**
   Remove the `SERO_STALL_STAGE` line from `.env`, restart, start a fresh 1:1 through to the prep brief.
   You should see: your brief arrives in ~10 seconds as normal. No error, no interruption.
   ❌ Not OK if: you get a "snag" card on a brief that was working.

3. **Retry actually works.**
   With the switch OFF, on any completed run, reload the brief screen.
   You should see: the brief appears immediately (it's cached).
   ❌ Not OK if: it re-thinks for 10s, or errors.

**A tell worth knowing:** if the spinner says *"Preparing your briefing"*, the connection to the server is alive. If it says *"Preparing your prep brief…"*, it never connected. Different problems.
