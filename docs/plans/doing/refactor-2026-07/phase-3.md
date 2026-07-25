# Phase 3 — server.ts guard wrappers

Goal: backend/api/server.ts repeats `if (!originOk(c.req)) throw forbidden("Bad origin")` inline in 64 route closures and clones the same per-IP rate limiter 4 times (~250 lines). Collapse both into the wrapper idiom the file already uses (internalV1/superadminV1 at ~:146).

Work: add an origin-guarded route wrapper + one `perIpLimit(cap)` factory; mechanically swap all 64 guard sites and 4 limiters. Complete the sweep — no mixed idiom left. Hot file: lane claimed, one sitting, land same day.

Verify: `npm test`, `npm run typecheck`, `replay-scenario --regression-all --fixtures-only` (same 2 pre-existing styleTip failures allowed, nothing new), `git diff --stat` showing the reduction.

QA: internal — closes on test output + the line-count drop. ✅ Pass: all green, ~250 lines lighter, no route behaviour change. ❌ Fail: any newly-failing check.
