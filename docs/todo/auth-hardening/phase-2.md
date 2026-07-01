# Phase 2 — Guard the doors (require login)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
A request to a protected endpoint with no valid login is **refused** (401), instead of
quietly falling through to the legacy unfenced view. Now that login is real (Phase 006/007),
the admin console should require it.

## How
Add one small guard the protected routes share: resolve the caller via `buildIdentity`;
if there's no `userId` (anonymous) **and** the dev side-door isn't active, return 401.

- New helper (mirrors `buildIdentity`'s home): `requireAuth(req)` →
  `RequestIdentity` or throws a 401. The dev side-door already yields an identity via
  `buildIdentity`, so dev one-click keeps working untouched.
- Apply it to the protected endpoints:
  - **Runs** (`runs.controller.ts`): `recent`, `finished`, `overview`, `full`, `stages`,
    `del`, `archive`, `review`.
  - **Sessions** (`sessions.controller.ts`): the read/write/stream handlers — i.e. resume,
    answer, streams, etc. **Exception:** `POST /start` stays open to anonymous (a logged-out
    visitor can still begin a session; it just stamps a null org). Decide & document this
    one boundary explicitly.

## Open decision (resolve before building)
**Does starting a session still allow anonymous?** Recommended: **yes** — keep
`POST /api/v1/sessions` (start) open so the public/demo flow isn't broken, but require
login for everything that lists or reads back existing data. Confirm this with Carl.

## Changes
- `backend/api/middleware/request-context.ts` — add `requireAuth(req)`.
- `backend/api/services/runs/runs.controller.ts` — guard the eight handlers.
- `backend/api/services/sessions/sessions.controller.ts` — guard the read/write/stream
  handlers (per the decision above).
- Tests: a 401-when-anonymous case for a representative runs route and a representative
  session route.

## Not in this phase
- Per-role permissions inside a company (parked).
- Any change to the login/register screens themselves.

## Done when
- [ ] Anonymous request to a protected runs route → 401 (not the legacy list).
- [ ] Anonymous request to a protected session read → 401.
- [ ] Logged-in requests work unchanged; dev side-door still works in dev.
- [ ] The agreed anonymous-start boundary behaves as decided.
- [ ] `npm test` green, `npm run typecheck` clean.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Logged out is locked out** — With no login (fresh/incognito browser), try to open
   the runs/history list in the admin console. You should be refused / sent to login —
   **not** shown a list of runs. ❌ Not OK if any runs appear.
2. **Logged in works** — Log in normally. The runs list and a run's detail load as before.
   ❌ Not OK if a logged-in user is wrongly blocked.
3. **Dev side-door still works** — In dev with the one-click login, everything opens as
   today. ❌ Not OK if the dev login stops working.
4. **Starting a session (agreed boundary)** — Confirm the start flow behaves as we decided
   (recommended: a logged-out visitor can still start a session). ❌ Not OK if it differs
   from the agreed behaviour.
