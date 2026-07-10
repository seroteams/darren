# Phase 2 — Return-signal tracking

**Part of:** [plan.md](plan.md) · **Status:** ✅

## ✅ GREEN-LIT 2026-07-10
Carl restarted the dev API (fresh :3001 process verified at 20:29) and walked the scenarios on localhost, then gave the "A". First "A" arrived before the restart — caught by the verify-the-green-light check and re-walked properly.

## Goal
One internal view answers the validation question at a glance: which manager used Sero, when, how often, and did they come back unprompted?

## Changes
*(corrected 2026-07-10 after dependency check — extend what exists, don't build new)*
- **Extend the existing User-management endpoint**, not a new page: `superadminService.listRegistered()` (`superadmin.service.ts:136-173`) already returns per-user `runCount`, `lastActiveAt`, `runsThisWeek/LastWeek`. Add `firstRunAt`, `gapDays` (run 1 → run 2) and a `cameBack` flag (second prep within ~14 days).
- Data source is the **`sessions`** table (there is no `runs` table — `schema.ts:92-142`): `userId`, `createdAt`, `lastSeenAt`, `finished`, already indexed. Add `createdAt` to the `pgListRunsForSuperadmin` projection (`runs-store.ts:402-409`) — a tight, reviewed diff (fence file).
- User-management view: add the new columns + "came back" badge; label internal accounts (Carl + test) so real testers stand out.
- Read-only throughout — no new writes, no schema change.
- **Coordination:** this phase and Phase 3 both touch `server.ts`/`shared/api.js` — they land sequentially, never in parallel.

## Not in this phase
- No charts or analytics beyond the table — this is a measuring stick, not a dashboard.
- No emails, alerts or nudges of any kind (validation rule: returns must be unprompted).

## Done when
- [ ] The view shows real rows from the live database — verified against a direct DB query for at least one account (DESTINATION check, not routing).
- [ ] A second run inside 14 days flips the "came back" badge for that manager.
- [ ] Internal/test accounts are visibly separated from real testers.
- [ ] Product owner has tested the scenarios below and said go.

## Built — 2026-07-10

- **Stores** — both superadmin run reads now project `createdAt` (when the run STARTED, from the session state; legacy rows fall back to `lastSeenAt`, never a fake 1970 date): `pgListRunsForSuperadmin` (`backend/db/runs-store.ts`) + the DB-less twin in `run-history.ts`. Read-only, no schema change — exactly as planned.
- **Service** — `superadmin.service.ts`: `RegisteredUser` gains `firstRunAt`, `gapDays` (run 1 → run 2, whole days), `cameBack` (2nd prep within 14 days) and `internal` (superadmin email or `@seroteams.com`). Test-first: 7 tests red → green (incl. unordered runs, the third-run trap, legacy-row fallback, no-runs = nulls not fake dates). 40/40 in the file.
- **View** — `admin-registered.ts`: a mint "came back" pill on the activity line (the one green badge on a row), a plain-words return line ("first run Thu 2 Jul 2026 · came back after 3 days" / "no second prep yet" / "returned after N days — outside the 2-week window"), and an "internal" tag on Carl + test accounts. Styles in `admin-tables.css` (14px floor verified).
- **Verified live** (isolated pair 3081/3083, dev side-door + own allowlist): the page shows 14 accounts; Carl's row reads 6 runs · first run 2 Jul · came back after 3 days.
- **DESTINATION check passed** — an independent direct-SQL query against local Neon (scratchpad script, read-only) recomputed Carl's signal: `{runCount: 6, firstRunAt: 2026-07-01T17:03:56.849Z, gapDays: 3, cameBack: true}` — identical to the page.
- **Checks** — `npm test` 111/111 · `npm run typecheck` clean · console clean · no paid runs.
- **Assumption flagged** — "internal" = superadmin allowlist OR any `@seroteams.com` email (hardcoded domain). Say the word if internal should mean something else.
- **Note for the walk** — restart `npm run dev` once so the API carries this build.

## Test scenarios — for the product owner
1. **See yourself** — open the User management page. Your own account should show your real run history: correct run count, a believable first-run date and last activity. ❌ Not OK if numbers look wrong vs what you know you did.
2. **The badge** — find an account that ran two preps within two weeks (or make one: run a quick prep on a test account that already has one). Its row should show the "came back" badge. ❌ Not OK if the badge never appears or appears for single-run accounts.
3. **Tester clarity** — imagine Manager X joined yesterday. Can you tell in 5 seconds whether they've returned? If you have to think about it, the layout fails.
