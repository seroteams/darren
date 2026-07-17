# Phase 3 — A crash while drawing your brief shows an error, not a spinner

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
If the brief arrives but something breaks while putting it on screen, the manager sees an error — not a spinner that never ends.

## Why this needs its own phase
This is the one hang **the Phase 1 watchdog cannot catch**. The brief genuinely arrived, so the watchdog was correctly cleared — and *then* drawing it threw. Different failure, different fix.

## Changes
- `shared/sse.js` (42, 78) — the handler is wrapped in `try/catch`, but the handlers are **async**, and `try/catch` cannot catch a rejected promise. So a crash while drawing the brief currently becomes an invisible unhandled rejection and leaves the skeleton up. Await the handler properly and route failures to the error path.

## Not in this phase
- Auto-reconnect — parked (see plan.md).

## Done when
- [ ] Test: an async handler that throws surfaces the error card (**red today** — it silently vanishes).
- [ ] `npm test` green; typecheck clean.
- [ ] Carl has walked the scenario below and said go.

## Test scenarios — for Carl
1. **Normal brief still lands.**
   Run a fresh 1:1 through to the prep brief.
   You should see: your brief, as normal, in ~10s.
   ❌ Not OK if: anything errors, or the brief looks different from before.

2. **Nothing else regressed.**
   Run one full 1:1 (person → meeting type → notes → focus → brief → questions).
   You should see: every step behaves exactly as it does today.
   ❌ Not OK if: any step hangs or errors.

*(The crash itself is covered by the automated test — it's not something you can trigger by hand without breaking the code on purpose.)*
