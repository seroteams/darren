# Phase 2 — Guard the doors (require login)

**Part of:** [PLAN.md](PLAN.md) · **Status:** ✅ done — tested (51/51 + live runs-gate smoke 5/5) + green-lit

## Goal
A request to a protected **runs** endpoint with no valid login is **refused** (401),
instead of quietly falling through to the legacy unfenced view. Now that login is real
(Phase 006/007), the admin console's saved-data endpoints should require it.

## Scope decision (resolved with Carl)
**Session *start* stays open to logged-out visitors** (chosen 2026-07-01). That choice
settles the whole phase:

- **Runs endpoints → require login.** These only ever serve *saved company data*; there's
  no anonymous-runs flow to preserve. Anonymous today gets the legacy **unfenced** list —
  that's the real HIGH finding. Lock all eight.
- **Session endpoints → left as Phase 1 (no login gate added).** With start open, an
  anonymous visitor who begins a null-org session *must* be able to read/answer it — so
  gating session reads behind login would break the open-start flow we just chose to keep.
  And Phase 1 already walls off every **company-owned** session (cross-company → 404). So
  the session surface is already covered; adding `requireAuth` there would contradict the
  start-open decision, not harden anything.

Net: **Phase 2 = require login on the eight runs endpoints.** `requireAuth` already exists
([require-auth.ts](../../../backend/api/middleware/require-auth.ts)) and is unit-tested.

## How
`runs.controller.ts` resolves the caller's company through one helper (`callerOrgId`).
Today it uses `buildIdentity` and returns `null` for anonymous → the service serves the
legacy unfenced list. Change that helper to `buildIdentity` **then `requireAuth(identity)`**
(the exact pattern `auth.controller.ts` already uses for `myRuns`): anonymous → 401, dev
side-door still yields an identity, logged-in unchanged. All eight handlers already call
this one helper, so they're all guarded by the single change.

## Changes
- `backend/api/services/runs/runs.controller.ts` — `callerOrgId` now requires login.
- Tests: `requireAuth` is already covered in `request-context.test.ts`; prove the wiring
  with a free live HTTP smoke (anonymous runs → 401, logged-in runs → 200).

## Not in this phase
- Any login gate on session endpoints (covered by Phase 1 + the start-open decision).
- Per-role permissions inside a company (parked).
- Any change to the login/register screens themselves.

## Done when
- [x] Anonymous request to a protected runs route → 401 (not the legacy list). *(live smoke: recent + finished both 401.)*
- [x] Logged-in requests to runs work unchanged; dev side-door still works in dev. *(live smoke: logged-in 200; side-door anon 200.)*
- [x] Session *start* + owner read still work (Phase 1 regression stays green). *(live smoke: anon start 201.)*
- [x] `npm test` green (51/51), `npm run typecheck` clean.
- [x] Product owner delegated QA to the agent; live runs-gate smoke ran green → go.

## Test scenarios — for the product owner
1. **Logged out is locked out of history** — With no login (fresh/incognito browser), try
   to open the runs/history list in the admin console. You should be refused / sent to
   login — **not** shown a list of runs. ❌ Not OK if any runs appear.
2. **Logged in works** — Log in normally. The runs list and a run's detail load as before.
   ❌ Not OK if a logged-in user is wrongly blocked.
3. **Dev side-door still works** — In dev with the one-click login, the history opens as
   today. ❌ Not OK if the dev login stops working.
4. **Starting a session still works logged-out** — Per our decision, a logged-out visitor
   can still start a session and use it. ❌ Not OK if start now demands login.
