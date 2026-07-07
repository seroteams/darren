# Phase 3 — Run-checks button

**Part of:** [PLAN.md](plan.md) · **Status:** ✅ done (built + verified 2026-07-01)

## Goal
Let you press a button on a step and have the app run its **free, safe** checks for you, then show ✅ pass / ❌ fail right there — so you don't have to run anything in a terminal yourself.

## Changes
- New backend endpoint (e.g. `POST /api/v1/checks/run`) that runs **only free, offline** checks — `npm test` (`node scripts/run-tests.js`) and `node scripts/replay-scenario.js <id> --fixtures-only` — and returns pass/fail plus a short summary.
  - **Hard rule:** this endpoint must NEVER run anything that hits the OpenAI API (no gate/smoke/eval/live replays). Those cost money and stay manual, per the cost rule. The endpoint allow-lists the two free commands and refuses anything else.
- `admin/src/stages/checklist.js` — a "Run the free checks" button per step (where it has an auto-check). Shows "Running…", then ✅ with the pass count or ❌ with what failed. The eyeball part still says "now you check: …".
- Follow backend house rules (slim controller → service → co-located repo, typed, test-first).

## Not in this phase
- Auto-running paid checks (never — parked).
- Auto-ticking your verdict from a passing check. A green check is information; the verdict tick stays your call (you still confirm the eyeball part).

## Done when
- [ ] Pressing "Run the free checks" on a step runs the test suite and shows ✅/❌ without you touching a terminal.
- [ ] The endpoint refuses any non-free command (proven by a test).
- [ ] `npm test` still green; new backend code is test-first.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these at **http://localhost:3000/todo**. Final phase — when this passes, the rebuild is done.
1. **One-click pass** — on a built step, press "Run the free checks". You should see "Running…" then a ✅ with how many tests passed. ❌ Not OK if nothing happens or you get a raw error dump.
2. **It really ran** — the result should match what you'd get running the tests yourself (same pass count). It shouldn't just always say ✅.
3. **No paid runs** — nothing you click should ever cost money or call the AI. (I'll show you in the code that only the two free checks are allowed.)
4. **Verdict still yours** — a ✅ check does NOT auto-tick "I've checked this". You still tick it yourself after the eyeball step.
