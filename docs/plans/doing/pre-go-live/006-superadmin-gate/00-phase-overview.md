# Phase 006 — Superadmin gate (backend)

## Goal (plain)
Give Carl's account a special, read-only key that can see across all alpha companies — safely, behind the
scenes. No screens yet; this phase just builds and proves the gate.

## What you'll have when it's done
- A **superadmin identity** — decided by an email allowlist (e.g. `SUPERADMIN_EMAILS`, Carl's email) — and
  a `requireSuperadmin` guard.
- Read-only cross-company endpoints that only a superadmin can reach (e.g. `GET /api/v1/admin/registered`
  listing companies → users). A normal owner/admin/member is refused.
- Built **test-first**, with an explicit test that a non-superadmin gets **403** and cannot see other
  companies' data.
- The existing per-company (`org_id`) fence is **untouched** for everyone else.

## A grounding example (before → after)
- **Before:** every runs/users read is fenced to your own company; nobody can see across companies.
- **After:** Carl's account (and only Carl's) can call `GET /api/v1/admin/registered` and get every
  company + its users; anyone else calling it gets 403.

## The steps (to be detailed when this phase starts)
1. Resolve the caller's **email server-side from the authenticated `userId`** — add it to `SessionIdentity`
   from the existing `users` join in `findIdentityByToken` — and match it against `SUPERADMIN_EMAILS`. The
   allowlist **never** reads a client-supplied value (no header, cookie, or body email). Normalize both
   sides through one shared function (trim + lower-case; reject empty). Add the `requireSuperadmin` guard
   beside [require-auth.ts](../../../../backend/api/middleware/require-auth.ts).
2. New superadmin service (its own folder under `backend/api/services/`) — a **structurally read-only
   module**: it exposes no write/delete functions and imports only read helpers (never `deleteRun` /
   `setArchived` / rating writers). Cross-org read = **loop the real `organizations`/`users` tables**
   (populated by signup) and reuse the existing per-org run walk per user. Wire **GET-only** routes in
   [server.ts](../../../../backend/api/server.ts) under a distinct namespace (e.g. `/api/v1/admin/*`), each
   routed through the one `requireSuperadmin` funnel so a new route can't be added un-guarded.
3. **Audit line:** append one record per superadmin request (timestamp, actor userId, route, target
   org/user) — the single most important compensating control for a cross-tenant key. One append line, not
   a logging subsystem.
4. Tests first: superadmin sees all; non-superadmin → 403; the query never leaks across orgs for a normal
   admin; **no superadmin route accepts a mutating method**. Run the 403 tests with **`DEV_AUTOLOGIN` off**
   (the dev side-door returns an owner identity with *no* allowlisted email, so it must never satisfy the
   gate — prove it can't).

## Security note (this is the one wall-crossing)
Read-only *by construction* (step 2), separate namespace + its own guard, allowlist-gated on a
**server-resolved** identity, every access audited. The per-company fence is a separate path and stays
exactly as it is. **The deferred human-expert security review (009) must explicitly include this new
superadmin wall-crossing in its scope** — it was written for the existing fence, which didn't have this
key. Book it before the alpha widens; also carry forward the 009 "close the anonymous session-start route
before widening" condition (tracked in PROGRESS). **Before staff data is viewable across companies, the
privacy note must disclose** that ratings are stored and that an internal Sero admin can view a company's
users/teams/runs (see PROGRESS decisions).

## How we'll know it's done (full list in `99-qa-signoff.md`)
- As Carl: the cross-company endpoint returns every company + users.
- As a normal owner/admin: the same endpoint → 403; own-company endpoints unchanged.
- `npm test` covers superadmin-yes / non-superadmin-403 / no cross-org leak. Typecheck clean. No OpenAI.

## Note
This is backend-only. Phases 007–008 build the screens on top of these endpoints.

> **Status:** overview only. Detailed step files get written when we start this phase.
