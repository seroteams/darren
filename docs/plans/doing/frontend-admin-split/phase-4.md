# Phase 4 — Serve + fence the two apps

**Part of:** [PLAN.md](plan.md) · **Status:** ⬜

## Goal
Make the customer app the thing the public reaches, and the admin app a separate, internally-reachable thing — then prove the customer download carries no admin code or secrets. This is where the split becomes a real security boundary, not just two folders.

## Changes
- API static-serving: serve `frontend/dist` (the customer app) at the public root; serve `admin/dist` on its own internal route/deploy (final host choice — separate URL vs internal path — decided with 009 Phase 2 hosting).
- Update the build/dev scripts so both apps build and run (dev ports + `npm run build`).
- Keep the existing server-side admin API wall ([admin-guard.ts](../../../backend/api/middleware/admin-guard.ts)) — this phase adds the *front-end* serving boundary on top of it.
- Add a check (script or note) that greps the built customer bundle for admin-tool code and key patterns.

## Not in this phase
- New auth for admin beyond what exists (a separate admin-login hardening is its own follow-up if wanted).
- The final production domain wiring lands with 009 Phase 2 hosting; this phase makes the local/served split correct.

## Done when
- [ ] The public URL serves the customer app; the admin app is reachable only via its own route/deploy.
- [ ] `frontend/dist` greps clean: no admin-tool modules, no `sk-`/key patterns.
- [ ] Both apps build (`npm run build`) and run.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Public = customer app** — open the public/root URL. You should get the customer login → prep flow, never an admin tool. ❌ Not OK if any internal tool is reachable from the public URL.
2. **Admin is separate** — open the admin route/URL. Full toolset loads (after admin login). ❌ Not OK if admin is reachable from the public root, or if the admin tools are exposed without login.
3. **Clean bundle** — I'll show you the grep of the built customer app proving no admin code / no keys shipped. You should see zero hits. ❌ Not OK if anything admin-ish or key-ish appears.
4. **Both still work** — one full prep run in the customer app, one tool used in the admin app. Both fine. ❌ Not OK if either broke.
