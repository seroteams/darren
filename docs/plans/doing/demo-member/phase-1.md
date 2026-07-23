# Phase 1 — Seed on signup

**Part of:** [plan.md](plan.md) · **Status:** ✅ green-lit

## ✅ GREEN-LIT 2026-07-22 — Carl approved after the fresh-signup walk (commit 543a8cba)

## Built (2026-07-22)

- `is_demo` flag on `people` + `sessions` (migration `0020_demo_member_flag.sql`, applied locally; applies itself on deploy).
- New `backend/api/services/auth/demo-seed.service.ts`: fire-and-forget seed beside the signup email in `auth.controller.ts` — clones the committed fixture `content/demo/demo-run.json` (Sofia · Product Designer · Mid-level · Bi-weekly check-in, 21 stage artifacts, exported from the local DB by `scripts/export-demo-fixture.ts`). Never throws; a broken seed can't break a signup.
- Admin/metrics exclusions: superadmin run list, Pulse + drill-downs, per-user run counts, returns report; `managedRosterCount` ignores the demo person and `deleteUser` removes the demo workspace with the account.
- Offline proof: npm test 169/169 (baseline 168/168), typecheck + lint:copy + lint:tokens clean. No OpenAI calls anywhere in the path.
- Live proof on local (session 50f944ac): registered a fresh account → Home showed the Sofia example 1:1, briefing + tabs rendered, Team showed her card, prep picker offered her; Postgres rows flagged `is_demo=true`; all three superadmin reads excluded it (run count 0); account delete removed every demo row (0/0/0/0).

## Goal
A brand-new registration comes with one flagged demo person and one finished example 1:1 already in the database, visible in the existing UI.

## Changes
- `backend/db/schema.ts`: add `is_demo` boolean (default false) to `people` and `sessions` (+ migration).
- New demo-seed service (backend, near auth): after `createOrgWithOwner` succeeds in `auth.service.ts`, create the demo person + clone one curated finished run from a shipped fixture (modelled on `scripts/seed-runs.ts`; fixture from `scripts/gallery/fixtures/`), back-dated a few days, all rows `is_demo = true`. Seeding failure must never fail registration (log and continue).
- Exclude `is_demo` rows from admin metrics, admin run lists and any validation counts (sweep `backend/api/services/` consumers of people/sessions).
- Tests: unit test the seed step; typecheck; no OpenAI calls anywhere in the path.

## Not in this phase
- Any visible "Example" labelling or remove button (phase 2).
- Backfill for existing accounts; auto-hide behaviour (parked).

## Done when
- [ ] Registering a fresh account locally puts a demo person + one finished demo run in Postgres, flagged `is_demo`, under the new org (verified by querying the DB, not by routing).
- [ ] Admin metrics / run lists show no demo rows.
- [ ] `npm test` + `npm run typecheck` clean; no paid calls.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.
1. **Fresh signup** — `local > frontend app (localhost:3000) > register a brand-new account`. Land on Home. You should see one example 1:1 in the list (no badge yet — that's phase 2). ❌ Not OK if Home is empty.
2. **Open it** — click the example 1:1. You should see a complete, readable briefing like a real finished 1:1. ❌ Not OK if it errors or looks half-built.
3. **Team** — open Team from the nav. The example person is on the roster with name and role.
4. **Existing account untouched** — log into your usual account. Nothing new appears.
