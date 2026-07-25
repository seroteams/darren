# Phase 3 — server.ts guard wrappers

**Built 2026-07-25 (session 17d7a976). Awaiting Carl's green light.**

Goal: backend/api/server.ts repeated `if (!originOk(c.req)) throw forbidden("Bad origin")` inline in 64 route closures and cloned the same per-IP rate limiter 4 times. Collapse both into the wrapper idiom the file already used (internalV1/superadminV1).

## What landed

- **One `perIpLimit(max)` factory** replaces the four copy-pasted limiter blocks (session start ×5/min, error reports ×30, password resets ×5, login/register ×10 — caps unchanged, each door keeps its own counter and the same 60s window).
- **One `guarded` origin wrapper** + three composed forms (`guardedV1`, `guardedInternalV1`, `guardedSuperadminV1`). All 64 inline checks swapped: 58 by a one-shot scripted transform (each rewrite printed and reviewed), 6 special cases by hand (the 5 rate-limited doors keep their limiter visible inline; persona-runs keeps its blockOnLive money fence).
- Check order preserved everywhere: auth gate → origin → rate limit → handler, exactly as before.
- The route table now reads one token per concern — a mutating route on bare `v1Route` is a visible smell rather than an invisible hole.
- **server.ts: 803 → 609 lines (−194).** Exactly one `originOk` call site remains (inside `guarded`).

## Verification (all free)

- `npm run typecheck` — clean.
- `npm test` — **183/183** (includes the two production-boot serving tests, so the server boots and serves both apps with the new wrappers).
- `replay-scenario --regression-all --fixtures-only` — identical to the pre-refactor baseline: only the 2 known pre-existing styleTip fixture failures, nothing new.
- `git diff --stat`: 102 insertions, 296 deletions.

## QA — what Carl checks

Internal phase: closes on the proof above.

1. ✅ Pass: the numbers read right — same behaviour, ~200 lines lighter, every protected door still protected.
2. ❌ Fail: anything reads wrong — say which, the whole phase is one revert.
