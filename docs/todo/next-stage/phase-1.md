# Phase 1 — Contracts

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done (2026-06-16)

## Goal
Write down every pipeline stage's input/output contract on one page so the
hardening phases that follow build against a known boundary, and fix or flag any
place where the doc and the code disagree.

## What landed
- [docs/contracts.md](../../contracts.md) — pipeline order (focus points → role
  profile → lexicon → questions → axes → briefing → run history), each stage with
  its field list, types, enums, and its validate / clamp / fallback behaviour.
- Cross-cutting section captures the trust boundaries enforced by
  `evals/trust-checks.js` + `scripts/gate.js` and the "no silent masking" rule.
- The one known gap — no deterministic briefing-generation fallback — is recorded
  in the doc and is exactly the Phase 3 scope.

## Verification (offline, no paid run)
- Contracts cross-checked against the live `RESPONSE_SCHEMA` exports in
  `generate.js`, `reviewer.js`, `role-profile.js`, `lexicon/schema.js`, plus
  `axes.js`, `questions.js`, `run-history.js`. No code mismatch found.
- `npm test` 28/28 (doc-only change, nothing to regress).

## Done when
- [x] Every stage's contract is on one page.
- [x] Any mismatch between doc and code is fixed code-side or flagged. (None
      found; the briefing-fallback gap is flagged for Phase 3.)
