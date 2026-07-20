# Phase 1 — Measure the skew (detect-only)

## ✅ GREEN-LIT 2026-07-20
Carl approved on the QA table (24 down / 11 up across 8 runs; 10/34 turns booked nothing) plus real wiped-answer examples. Verified: 14 new gate tests, suite 160/160, typecheck clean, regression replay diff-free vs baseline (2 listenFor fixture fails pre-exist, other lane).

**Status:** ✅ closed
**Rule:** zero behaviour change to scores. Every fixture replays identically.

## Changes
1. `backend/engine/delta-gates.ts`
   - New `isTerseButConcrete(answer)`: a note that trips the ≤2-token shallow floor but carries ≥1 real content word (reuses the existing FILLER_ONLY + LOW_SIGNAL machinery; "Shipped the payments fix" → true, "fine" → false).
   - `applyShallowGate` gains an optional `overflow` sink: every zeroed delta is recorded as `{axis, raw, booked: 0, reason}` where reason is `shallow_zeroed`, or `shallow_zeroed_protect_eligible` when the delta was positive AND the answer is terse-but-concrete. Deltas are still zeroed — detection only.
2. `backend/engine/queue-manager.ts` (planTurn ~381): pass an overflow sink into `applyShallowGate`; merge it with `clampToSignature`'s overflow into the existing `unbooked_signal` return.
3. `backend/shared/session.types.ts:104`: comment updated to name the new reasons (type unchanged — `reason` is already `string`).

Privacy: overflow entries carry ONLY axis/raw/booked/reason — never answer text (same rule as clampToSignature).

## Deferred (lane clash)
`run-health.ts` `scoring` summary block — file is in the promises-loop chat's lane (1b4b459f). Added in a later slice once that lane clears. The Phase-1 QA table is computed from existing `logs/**` transcripts with a scratch script instead (read-only, not committed).

## Tests (written first)
- New `backend/engine/delta-gates.test.ts`:
  - isTerseButConcrete boundaries: "Shipped payments-fix" (2 tokens, concrete) ✓, "fine" ✗ (filler), "ok good" ✗ (low-signal only), "yeah he said things are ok" ✗ (reporting wrapper, no content), "(skipped)" ✗.
  - applyShallowGate: records one overflow entry per zeroed axis; positive delta + terse-but-concrete → `shallow_zeroed_protect_eligible`; negative → `shallow_zeroed`; non-shallow answer → no entries; deltas all zeroed either way; works with sink omitted (back-compat).
- Existing `queue-manager.test.ts` untouched.

## Verify (all free)
- `npm test` green · `npm run typecheck` green
- `node scripts/replay-scenario.js --regression-all --fixtures-only` → zero score diffs
- Skew table from 3–5 recent runs for Carl's QA

## QA scenarios (Carl)
1. Look at the skew table: does the up-vs-down imbalance look real and worth fixing?
2. Confirm nothing changed in the product: any recent run replayed reads identically.
Green light = Phase 2 (arming the protect gate) once the promises-loop lane clears.
