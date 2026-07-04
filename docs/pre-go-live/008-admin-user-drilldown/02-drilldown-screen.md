# Phase 008 · Step 02 — The drilldown screen (frontend)

> **Status: 🔨 built 2026-07-04 — awaiting Carl's QA.** New admin stage `admin-user-detail.ts` at
> `/admin/users/:id` (6-step wiring: state STAGE + fields `adminUserId`/`adminUserName` + router
> path/parse/ADMIN_ONLY + main loader + boot/popstate deep-link + `getUserRuns()`). Registered-screen user
> rows are now buttons that drill in. The page shows the user's **people** (reuses PG4 `groupRunsByPerson`)
> and their **1:1s** with PG3 ratings, plus a back button; loading/empty/error states; all values escaped,
> ≥14px. Still superadmin-only (ADMIN_USER in ADMIN_ONLY + the backend 403). Verified: `npm test` 57/57 ·
> both typechecks clean · `npm run build` compiles the stage. Opening a briefing read-only is Step 03. No OpenAI.

## Goal
From the Registered screen, click a user → see their people and their 1:1s with ratings.

## Technical detail
- New stage renders `groupRunsByPerson(runs)` (PG4) for the people list + PG1-style run rows with PG3 star
  badges; data from `GET /api/v1/admin/users/:id/runs` (Step 01).
- Reached by clicking a user on the Registered page (`adminUserId` + `adminUserName` in the store); the
  URL is `/admin/users/:id` (deep-linkable; the name shows generic until load on a cold open).

## Check
- As Carl: click a user on Registered → their people + 1:1s + ratings; back returns to the list.
- As a normal owner: the route is refused (403) and the whole admin surface is unreachable.
- `npm test` + typecheck green; `npm run build` compiles. No OpenAI.
