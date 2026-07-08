# Auth hardening — fence live sessions + guard the endpoints

**Goal:** Close the two access-control gaps the post-Phase-007 health check found, so a
logged-in company can only ever touch its **own** live sessions, and the protected
endpoints refuse anonymous callers instead of quietly serving the legacy unfenced view.
**Driver:** Carl
**Created:** 2026-06-29

## Why this exists
Phase 007 walled off **finished runs** per company. The health check confirmed two
holes that were left open (and parked):

1. **Live, in-progress sessions are NOT fenced.** Anyone who knows a session id can
   read or write that session — across companies. (`sessions.service.ts` `requireExisting`
   looks a session up by id with no company check.)
2. **Runs/session endpoints have no route-level auth guard.** A request with no login
   cookie doesn't get denied — it falls through to the *legacy unfenced* view
   (`runs.controller.ts` `callerOrgId` → null → unfenced).

## Done means
- A logged-in user from Company B who opens Company A's live-session link sees
  "not found" — never A's data — on every read, write, and live stream.
- A user resuming **their own** company's session still works exactly as today.
- Hitting a protected endpoint with no login is refused (401), not served the legacy view.
- The dev one-click side-door and any anonymous/CLI path still work where they should.
- `npm test` green; typecheck clean.

## Phases
| # | Phase | What it lands | Status |
|---|---|---|---|
| 1 | Fence live sessions by company | Caller's company threaded into the session lookup; cross-company access returns 404 on every read/write/stream | ✅ |
| 2 | Guard the doors (require login) | Runs endpoints refuse anonymous callers (401) instead of the legacy unfenced view (sessions covered by Phase 1 + open-start decision) | ✅ |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**✅ COMPLETE — both phases done, tested, committed. Plan closed out to `docs/archive/done/`.**

- Phase 1 (fence live sessions): the company wall lives in `sessions.service.ts`
  `requireExisting(id, callerOrgId?)` — cross-company id → same 404 as missing.
  `sessions.controller.ts` threads the caller's company into every read/write/SSE stream.
  Committed `12fc3071`. Tested: 51/51 + 5 wall unit tests + live 2-company smoke 8/8.
- Phase 2 (guard the doors): `runs.controller.ts` `callerOrgId` now does `buildIdentity` →
  `requireAuth` — all eight runs endpoints refuse anonymous (401) instead of the legacy
  unfenced list. Sessions deliberately left as Phase 1 (open-start decision, 2026-07-01).
  Tested: 51/51 + live runs-gate smoke 5/5 (anon 401, logged-in 200, dev side-door 200,
  anon start still 201).
- Both health-check holes are now shut. See SERO_BOARD.md.

Pre-work this session (health check): fixed the stale smoke-test placeholder check that
was blocking the whole gate/smoke harness — committed `0331cfa0`.

## Parked
- **Audit endpoint:** a "list my company's live sessions" view (out of scope — we only
  fence what exists today).
- **Org-role granularity:** per-role permissions within a company (owner vs member).
  This plan fences at the *company* boundary only.
- **Rotating/expiring session links:** signed, time-boxed session URLs — a bigger design.
