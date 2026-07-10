# Engine-hardening (3 wins mined from old Sero)

**Goal:** make the engine more robust and observable — latency capture, a concurrency cap + circuit breaker, and positive validation checks — without adding any manager-facing surface.
**Driver:** Carl (from the RUNNER.md old-Sero review, 2026-07-10)
**Created:** 2026-07-10

## Done means
- Every recorded AI call carries how long it took (`ms`), summed per run.
- Concurrent live model calls are capped, and a failing provider trips a breaker instead of being hammered.
- The briefing gate makes positive assertions (names the person / cites real data), not just banned-phrase detection.

## Resolved before we start
- Cost tracker: `record(stage, model, usage)` in [cost.ts](../../../../backend/engine/cost.ts); `CostCall`/`CostSummary`/`CostTracker` in [cost.types.ts](../../../../backend/shared/cost.types.ts). No duration field today.
- AI calls: `_callOpenAI` / `_callGemini` in [ai-client.ts](../../../../backend/engine/ai-client.ts) each wrap a `fetchWithTimeout` in `withRetry`. No concurrency cap, no breaker. Cassette replay path returns early (no network).
- Briefing gate: `runManagerBriefingBans` etc. in [golden-checks.ts](../../../../backend/engine/golden-checks.ts) return `failures[]` arrays. Banned-phrase only, no positive checks.
- **This whole track is offline/unit-testable — zero paid OpenAI runs.**

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Latency capture | Every AI call records `ms`; run summary has `total_ms` | ✅ |
| 2 | Concurrency cap + circuit breaker | `ai-guard.ts` caps concurrent live calls + trips a breaker | ⬜ |
| 3 | Positive validation checks | Briefing gate asserts name + real-data grounding | ⬜ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
Phase 1 ✅ green-lit + committed 2026-07-10 (latency capture: `ms` per call, `total_ms` per run; 112/112, typecheck clean, $0). **Phase 2 next** (concurrency cap + circuit breaker). Baseline below.

## Baseline (free checks, pre-work) — 2026-07-10
- `npm test` → **111/111 passed** (clean)
- `npm run typecheck` → **clean, no errors**
- No paid runs used (money rule — whole track is offline-testable).

## Parked
- Promote Phase 3 checks from warn-level to a hard gate only after they're quiet against all fixtures.
- Note-only ideas from the RUNNER.md review (GDPR cascade order, rate-limit tiers, unhandledRejection handler) — reference, not this track.
