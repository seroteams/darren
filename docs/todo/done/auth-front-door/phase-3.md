# Phase 3 — Keep people in, guard the doors (+ dev side-door)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Stay logged in after login, turn logged-out visitors away from protected pages — and give Carl a private one-click way in while testing that real customers can never use.

## Changes
- On successful login, create an `auth_sessions` row and set an **httpOnly, secure** cookie holding the opaque session id. A refresh keeps you logged in.
- Fill in [backend/api/middleware/request-context.ts](../../../backend/api/middleware/request-context.ts) `buildIdentity()` — read the cookie, look up the session, return the real `{ userId, orgId, roles }` (instead of always anonymous).
- Fill in [backend/api/middleware/require-auth.ts](../../../backend/api/middleware/require-auth.ts) — reject when there's no logged-in user. Apply it to protected routes.
- `POST /api/v1/auth/logout` — clears the cookie and the session row.
- **Dev side-door:** when `NODE_ENV` is not `production` **and** `DEV_AUTOLOGIN` is set, `buildIdentity()` returns a seeded dev user automatically — no cookie needed. Off by default.

## The one rule (hard gate)
The side-door must be **impossible** in production. The check is `NODE_ENV !== 'production' && process.env.DEV_AUTOLOGIN`. A test sets `NODE_ENV=production` **with** `DEV_AUTOLOGIN` on and proves the request is still anonymous (the bypass is dead). A bypass that could ship is a backdoor — this gate is non-negotiable.

## Not in this phase
- No company-creation / data fencing yet — that's Phase 4 (login still attaches to the test org).
- No password reset, no "remember me" beyond the session's normal expiry.

## Done when
- [ ] A test proves a protected route is **refused when logged out** and allowed when logged in.
- [ ] A test proves the dev side-door is **dead when `NODE_ENV=production`**, even with `DEV_AUTOLOGIN` set.
- [ ] `npm test` and `npm run typecheck` green.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Stay logged in** — log in, then refresh. You should still be logged in. ❌ Not OK if a refresh logs you out.
2. **Guard works** — log out, then try to reach a protected page/endpoint. You should be turned away. ❌ Not OK if you can still get in.
3. **Side-door (your machine)** — set `DEV_AUTOLOGIN` and start the app locally. You should land straight in, no password. ❌ Not OK if you still have to log in.
4. **Side-door is sealed for customers** — I'll show you the passing test that proves the side-door does nothing in production. You should see it green. ❌ Not OK if that test is missing or red.
