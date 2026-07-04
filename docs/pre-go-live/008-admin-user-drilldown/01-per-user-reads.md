# Phase 008 · Step 01 — Per-user runs read (backend, test-first)

> **Status: 🔨 built 2026-07-04 — awaiting Carl's QA.** New superadmin-only, read-only, cross-org
> `GET /api/v1/admin/users/:id/runs` behind the same `requireSuperadminRoute` gate. Reuses the run walk:
> `listFinishedRunsForUser(userId)` (all orgs, finished runs, attributed by `userId`, member-safe row shape
> with PG3 rating) → repo `listRunsForUser()` → service `userRuns()` (newest-first). Test-first: 2 new
> service assertions (sorted newest-first, unknown user → empty). `npm test` 57/57 · typecheck clean · no
> OpenAI. Next: Step 02 renders it (people via PG4 grouping + runs), Step 03 opens a briefing read-only.

## Goal
The backend read the drilldown needs: one user's finished 1:1s (with ratings), across companies, reachable
only by the superadmin.

## What you'll have
- `GET /api/v1/admin/users/:id/runs` → `{ runs: [{ id, headline, ctx, lastSeenAt, rating }] }`, newest-first.
- Superadmin-only (the PG6 gate); read-only; no briefing body here (that's Step 03's read-only view).
- All derived from the existing run walk + PG3 ratings — no new store.

## Technical detail
- `run-history.listFinishedRunsForUser(userId)` mirrors `listFinishedRunsForMember` but drops the org
  fence (attribution is by `userId` only) — the one cross-tenant read, behind the superadmin repo/route.
- Repo `listRunsForUser()` adapts it; service `userRuns()` sorts newest-first (unit-testable via the fake).
- Controller reads `:id` from the path; the route goes through `superadminV1` so it can't be added un-gated.

## Check
- Tests: newest-first ordering, unknown user → `[]`. `npm test` + typecheck green. A normal owner is
  refused by the gate (403). No OpenAI.
