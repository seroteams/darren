# Phase 1 — Login gate + screens (fold into admin)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done (green-lit + committed 2026-06-29)

## Goal
Make the console require login. Add register / login / logout screens that use the Phase 006 endpoints, and a boot gate that sends logged-out visitors to login and logged-in ones into the app.

## Changes
- **API client** — add auth calls to [admin/src/api.js](../../../admin/src/api.js), reusing its `json`/`postJson` helpers: `register({email,name,password,company})` → `POST /api/v1/auth/register`, `login({email,password})` → `POST /api/v1/auth/login`, `logout()` → `POST /api/v1/auth/logout`, `me()` → `GET /api/v1/auth/me`. Cookie is automatic — no token handling.
- **Auth state** — add a `user: {userId, orgId, name, role} | null` slice to [admin/src/state.js](../../../admin/src/state.js).
- **Screens** — a **login** stage and a **register** stage following the existing `mount/unmount` stage pattern ([admin/src/stages/*.js](../../../admin/src/stages/start.js)) + [admin/src/router.js](../../../admin/src/router.js) entries. Reuse the [admin/src/ui/field.js](../../../admin/src/ui/field.js) pattern + design system; one error line driven by the backend's `{ error }` shape.
- **The gate** — in [admin/src/main.js](../../../admin/src/main.js) boot, call `me()` first: `401` → login stage; `200` → set user in state, proceed to START. Existing stage bootstrap only runs when authenticated.
- **Logout** — a button in [admin/src/ui/session-topbar.js](../../../admin/src/ui/session-topbar.js): `logout()` → clear user state → login.
- **Dev side-door** — keep the Phase 006 `DEV_AUTOLOGIN` one-click login working behind its existing gate; don't expand or leak it.

## Not in this phase
- No data re-point yet — screens keep reading the placeholder-org legacy `/api/` routes until Phase 2.
- No org-name display (parked); no password reset / invitations.

## Done when
- [x] `npm test` (49/49) and `npm run typecheck` green.
- [x] Live walk of the scenarios below passes against the running dev server (all 5, verified 2026-06-29).
- [x] Product owner has tested the scenarios and said go (2026-06-29 — "logged in and out and work swell").

## Test scenarios — for the product owner
Walk these yourself. Phase 2 waits for your green light.
1. **Register** — make a new account. You should land in the app. ❌ Not OK if it errors or leaves you at login.
2. **Stay logged in** — refresh the page. You should still be in. ❌ Not OK if a refresh logs you out.
3. **Logout** — click logout. You should be back at the login screen. ❌ Not OK if you're still in.
4. **Login again** — log in with that account. You should be back in. ❌ Not OK if a correct password is refused.
5. **Guard** — while logged out, try to open a screen directly. You should be bounced to login. ❌ Not OK if you get in.
