# Phase 3 — Slim the admin app

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## Goal
Now that the customer app owns the customer screens, remove those customer-only stages from the **admin** build so `admin/` is internal tooling only. The admin bundle gets smaller and stops carrying the customer flow.

## Changes
- Remove the customer-only stages from the admin app's stage map and routes (the prep-flow screens + member Home/Team/Runs) — keep only what an internal admin needs (the tools, plus admin login).
- Delete or relocate any now-orphaned customer stage files so they live with the customer app, not admin.
- Clean up admin nav/router so it no longer references the removed screens.
- Remove imports/dead code that *these* removals orphan (surgical — only what this change makes unused).

## Not in this phase
- Hosting/serving changes (Phase 4).
- Touching the customer app (it already owns those screens from Phase 2).

## Done when
- [ ] The admin app still shows and runs every internal tool.
- [ ] The admin app no longer serves the customer prep flow / member screens.
- [ ] `npm test` + `npm run typecheck` clean; no dead imports left by the removal.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Admin tools intact** — open the admin app, click through the internal tools (Library, Compare, Personas, Regression, etc.). All present and working. ❌ Not OK if any tool vanished or errors.
2. **Customer flow gone from admin** — in the admin app, try to reach the member Home or the prep flow. It should no longer be there (redirect / not-found), because that now lives in the customer app. ❌ Not OK if the old customer flow still runs inside admin.
3. **Customer app still whole** — re-open the customer app; the prep flow + Home/Team/Runs still work (nothing was pulled out from under it). ❌ Not OK if a customer screen broke.
