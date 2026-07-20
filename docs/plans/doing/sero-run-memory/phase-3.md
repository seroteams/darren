# Phase 3 — Origin badges

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
Every run is labelled where it came from — Real / Friend trial / Internal / QA — so the learning data can be filtered by source.

## Changes
- `backend/db/schema.ts` — `organizations.kind` text NOT NULL default `"real"` (`real | friend_trial | internal`) + `sessions.origin` text nullable; `npm run db:generate` migration (server auto-applies at boot).
- `sessions.service.ts:~449-493` — origin snapshot at session start: scripted or userId=null → `"qa"`, else the org's kind. `sessions-store.ts:~46-48` denormalizes the column. `run-fingerprint.ts` + `session.types.ts` carry it.
- Superadmin org endpoint + admin selector to set an org's kind; origin badge column in `admin/src/stages/admin-runs.ts` per the approved mockup.

## Not in this phase
- No ledger table, no pool view, no engine behaviour change.

## Done when
- [ ] Origin-derivation matrix tested (manual real org / manual friend org / scripted / userId-null); store mapping test; `alignment-check.test.ts` green; generated SQL reviewed.
- [ ] A fresh run's row in the DB carries the right `origin` value — checked in the DB, not just the UI.
- [ ] Product owner has tested the scenarios below and said go.

## Test scenarios — for the product owner
1. **Badge a friend** — Admin > organisations > flip a test org to "Friend trial". Run a 1:1 as that org's manager. The runs list badges it "Friend trial". ❌ Not OK if the badge needs a page-refresh dance or shows on OLD runs retroactively.
2. **QA runs are QA** — run a persona from the test-engine page: badges "QA" automatically.
3. **Your own runs** — flip your org to "Internal": your next run badges "Internal"; earlier runs stay unbadged (legacy).
