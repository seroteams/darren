# Phase 4 — (optional) Promote the stage-id check to a standing gate

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜ (optional — only if Carl wants it)

## Goal
Close the silent-routing hole for good: a question tagged with a phase id that doesn't exist
should be caught by `npm test`, not discovered in production (today it silently sorts to the
end of the queue).

## Changes
- Turn Phase 1's `diffStageIds` into a standing golden-check (in the `src/golden-checks.js`
  family) that scans `questions/` against the live arcs and fails on any orphaned tag.
- Register it in the offline test run (`scripts/run-tests.js`).
- De-hardcode `scripts/test-intro-order.js` so its expected phase ids are derived from the
  arcs rather than literal strings — so an arc edit can't leave the test asserting stale ids.

## Not in this phase
- No new UI. This is test/safety hardening only.

## Done when
- [ ] A deliberately mis-tagged question makes `npm test` fail with a clear message.
- [ ] Removing the bad tag makes it pass again.
- [ ] `test-intro-order.js` derives its expected ids from the arcs (no literal phase ids).
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself.
1. **Bad tag is caught** — I'll temporarily mis-tag one question to a non-existent phase and
   run `npm test`; it fails and names the offending question. ❌ Not OK if it passes.
2. **Clean tree is green** — with the bad tag removed, `npm test` passes.
3. **Rename is safe** — I'll show that renaming a phase id and updating its questions keeps
   the test green, while forgetting to update them turns it red.
