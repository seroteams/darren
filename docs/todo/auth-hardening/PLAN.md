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
| 2 | Guard the doors (require login) | Protected runs + session endpoints refuse anonymous callers (401) instead of the legacy unfenced view | 🔨 |

⬜ not started · 🔨 in progress · ✅ done (tested)

## Current state
**Phase 1 ✅ done + committed. Phase 2 🔨 in progress** (the login-required door).

- Phase 1 landed: the company wall lives in `sessions.service.ts` `requireExisting(id, callerOrgId?)`
  — a cross-company id throws the same 404 as a missing session. `sessions.controller.ts`
  threads the caller's company (from the cookie) into every read, write, and SSE stream
  via an `assertOwner` helper. Null-org (anonymous/legacy) sessions stay open, unchanged.
- Phase 1 tested: typecheck clean; `npm test` 51/51 incl. 5 new wall unit tests; + a free
  live 2-company HTTP smoke (side-door OFF, no OpenAI key) — 8/8 (owner 200/202, other
  company + anonymous 404 on read/question/write, legacy null-org still 201/200). Green-lit.
- Phase 2 next: `requireAuth` on the protected runs + session endpoints; anonymous → 401
  instead of the legacy unfenced view. Open decision to confirm: keep session *start* open
  to logged-out visitors (recommended).

Pre-work this session (health check): fixed the stale smoke-test placeholder check that
was blocking the whole gate/smoke harness — committed `0331cfa0`.

## Parked
- **Audit endpoint:** a "list my company's live sessions" view (out of scope — we only
  fence what exists today).
- **Org-role granularity:** per-role permissions within a company (owner vs member).
  This plan fences at the *company* boundary only.
- **Rotating/expiring session links:** signed, time-boxed session URLs — a bigger design.
