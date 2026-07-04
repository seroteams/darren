# Phase 2 — Delete dead cruft

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Throw out the scratch scripts and dead code left over from closed phases, and empty the oversized log folder.

## Changes
- Delete dead one-off scripts: `scripts/batch-m1-verify.js`, `batch-m3-verify.js`, `batch-m5-verify.js`, `verify-maya-jun17-damper.js`, `verify-maya-live-manual.js` (+ `batch-l-verify.js` and `manual-qa-verify.js` after double-checking nothing calls them). **Keep `batch-m4-verify.js`** — `eval.js` uses it.
- `backend/engine/product-qa.ts` — never called by anything; delete it (and its export in `engine/index.ts`).
- `backend/shared/clamp.ts` — tested but unused; delete it and its test (production code inlines the same thing).
- Run `npm run logs:purge` (local disk only, free) — June alone is 220MB.
- Prune the 7 old `claude/*` remote branches.

## Not in this phase
- Any code that's actually running. Deletions only.

## Done when
- [ ] `npm test` still 52/52 and both typechecks pass
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
1. **The app still runs** — open the admin app, click around a few pages. ❌ Not OK if anything errors.
2. **Disk space came back** — the `logs/` folder should be far smaller (I'll report before/after sizes).
3. **Free checks are green** — confirm my pasted `npm test` result says 52/52.
