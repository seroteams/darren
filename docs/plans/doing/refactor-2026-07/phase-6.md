# Phase 6 — shared run-row projections

Goal: backend/engine/run-history.ts (file store) and backend/db/runs-store.ts (PG store) copy-paste the same row projections, kept in sync only by "kept in parity with…" comments. Extract one shared module so a new run field can't silently diverge.

Work: new shared projections module (e.g. backend/db/runs-projections.ts); migrate one projection at a time (toFinishedRow, toMemberRow, toMemberView, about-person row…), running backend/tests/runs/test-pg-runs-parity.js between each move; delete the parity comments last.

Verify: `npm test` with the parity test called out; `npm run typecheck`; `replay-scenario --regression-all --fixtures-only` (no new failures).

QA: internal — closes on the parity-test output. ✅ Pass: parity green after every move. ❌ Fail: parity test red at any step (revert that move).
