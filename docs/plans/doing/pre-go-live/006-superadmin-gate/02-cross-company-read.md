# Phase 006 · Step 02 — The read-only cross-company endpoint (test-first)

## Goal
Behind the superadmin gate, expose one GET endpoint that lists every alpha company and its users — the
first cross-company read. No screen (that's PG7); this is the endpoint + its tests.

## What you'll have
- `GET /api/v1/admin/registered` → `{ companies: [{ id, name, createdAt, users: [{ id, name, email, role,
  createdAt }] }] }`, ordered oldest-company-first. Reachable **only** through `requireSuperadminRoute`.
- A **structurally read-only** superadmin service — it exposes and imports no write/delete helpers.
- Tests **first**: superadmin sees all companies+users; a normal owner → 403; a normal admin's own-company
  reads are unchanged; a superadmin route rejects any mutating method (POST/PUT/PATCH/DELETE → 405/404).

## A grounding example
- **Before:** every users read is fenced to your own `org_id`; no path sees across companies.
- **After:** Carl calls `/api/v1/admin/registered` → every company and its people; an owner calling it → 403.

## Technical detail
- New service folder `backend/api/services/superadmin/` (house rules: co-located `superadmin.service.ts`,
  `superadmin.repo.ts`, `superadmin.controller.ts`, `superadmin.service.test.ts`).
- **Read-only by construction:** the repo runs SELECT-only queries over the real `organizations` and `users`
  tables (schema.ts, populated by signup). It imports **no** writer (never `deleteRun` / `setArchived` /
  rating writers). The service returns plain view objects; it exposes no mutation.
- Wire GET-only in [server.ts](../../../../backend/api/server.ts) under `/api/v1/admin/*`, **every** route
  funnelled through `requireSuperadminRoute` so a route can't be added un-guarded. No non-GET verb is
  registered on this namespace.
- Never select `password_hash` (or any secret) into the view — id, name, email, role, timestamps only.
- (User → their teams/runs drill-down is **PG8**; this step is companies → users only.)

## Check
- Tests first (red→green): `superadmin → full list`, `owner → 403`, `no cross-org leak for a normal admin`,
  `mutating method on /api/v1/admin/* → refused`, `password_hash never present in the payload`. `npm test`
  green, `npm run typecheck` clean. The per-company fence for everyone else is untouched. No OpenAI.
