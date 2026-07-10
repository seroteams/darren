# Phase 2 — Return-signal tracking

**Part of:** [plan.md](plan.md) · **Status:** ⬜

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

## Test scenarios — for the product owner
1. **See yourself** — open the User management page. Your own account should show your real run history: correct run count, a believable first-run date and last activity. ❌ Not OK if numbers look wrong vs what you know you did.
2. **The badge** — find an account that ran two preps within two weeks (or make one: run a quick prep on a test account that already has one). Its row should show the "came back" badge. ❌ Not OK if the badge never appears or appears for single-run accounts.
3. **Tester clarity** — imagine Manager X joined yesterday. Can you tell in 5 seconds whether they've returned? If you have to think about it, the layout fails.
