# Phase 4 — Backend dedup

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ green-lit 2026-07-04 — live gate case PASSED (1 ok / 0 regressed)
(snap helpers deliberately NOT merged — divergence documented instead; see PLAN.md Current state)

## Goal
The engine has one prompt-filling helper and one delta-snapping helper instead of five and two copies, and the test runner can never silently skip a new test.

## Changes
- New `fillPlaceholders(template, vars)` helper; use it in the five prompt builders (`reviewer.ts`, `generate.ts`, `preparation.ts`, `lexicon/review-core.ts`, `question-generator.ts`). Same output, one place to maintain.
- One shared `snapDelta()` — **careful:** the two copies are NOT identical. The planner's
  (queue-manager, covered by `test-delta-snap.js`) tie-breaks toward zero; the bank's
  (question-generator) tie-breaks positive (2 → 3, no 0 in its list). Found during Phase 1.
  Either share one helper with a tie-break option, or document why both exist and skip.
- `scripts/run-tests.js` — auto-discover `scripts/test-*.js` with a small `PAID_TESTS` exclude list, instead of the hand-maintained 28-entry array.

## Not in this phase
- Guard-factory for admin/superadmin middleware (parked, optional).
- Any prompt WORDING changes — the prompts sent to the model must be byte-identical.

## Done when
- [ ] `npm test` + both typechecks green (and same number of tests discovered as before: the runner prints the count)
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **Test count unchanged** — my pasted `npm test` output should show the same tests running as before (52), just auto-found now.
2. **A full practice run still works** — one-page run through to the briefing; prep, bank, and briefing should read as normal. ❌ Not OK if any stage errors or the text looks garbled (e.g. a leftover `{{NAME}}` showing).
3. **Free checks are green** — confirm my pasted results.
