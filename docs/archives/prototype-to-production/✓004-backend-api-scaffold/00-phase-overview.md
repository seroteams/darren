# Phase 004 — Backend API v1 (RESTful, Test-Driven)

## Goal (plain)
Reshape the backend into clean, predictable layers behind a **versioned, RESTful API** — and build it
**test-first**. The app keeps doing what it does today; it's just organised so it can grow without
turning into spaghetti.

## What you'll have when it's done
- A clear web server where **every route lives under `/api/v1/`** (so we can ship a v2 later without breaking v1).
- A **RESTful** API: resources are nouns, actions are HTTP verbs, status codes are used correctly, and
  every response shares one JSON shape (and one error shape).
- The layers:
  - **Controllers** (slim) — take a request, hand off, return a response. No logic.
  - **Services** — the actual logic, grouped in **per-domain folders** (auth, sessions, runs, lexicon…).
  - **Repos** — data access, **co-located** in each domain folder (e.g. `sessions/sessions.repo.ts`).
  - **Middleware** — shared concerns: error handling, request/session context, CORS, an auth slot for later.
- **Every service built TDD** (red → green) using the skill from Phase 002.
- A **test directory that mirrors the system** — unit tests beside the code, integration/e2e under a
  `tests/` tree shaped like the domains. **Not one flat folder.**
- A written **API contract** (the endpoints, their verbs, and payloads).
- Repos are still **file-backed** here — same storage, clean seam — ready to swap to Postgres in Phase 005.

## The REST rules we're locking in
- Plural resource nouns: `/api/v1/runs`, `/api/v1/sessions`, `/api/v1/organizations`.
- Verbs via HTTP method, not the URL: `GET` (read), `POST` (create), `PATCH` (update), `DELETE` (remove).
- Correct status codes (200/201/204, 400/401/403/404, 422, 500…).
- Filtering/paging via query params; nest routes sparingly.

## A grounding example (before → after)
- **Before:** `frontend/server/handlers/plan.js` does request-handling, logic, and file I/O in one file,
  at an ad-hoc URL.
- **After:** `POST /api/v1/sessions/:id/turns` → `sessions.controller.ts` (request in/out) →
  `sessions.service.ts` (the planning logic, written test-first) → `sessions.repo.ts` (data). Three small files, one job each.

## The steps (to be detailed when this phase starts)
1. List the resources/domains and write the `/api/v1/` contract.
2. Stand up the middleware layer (error, context/session, CORS, auth placeholder).
3. Build each domain controller → service → repo **TDD**; repos file-backed for now.
4. Set up the mirrored test tree.

## How we'll know it's done (full list in `99-qa-signoff.md`)
- Every route is under `/api/v1/` and follows REST verbs/status codes.
- Each service has passing tests written before the code.
- The app behaves identically to before; a repo's storage could be swapped without touching its service.

## Note
Depends on Phase 003 (typed code) and Phase 002 (TDD + conventions).

> **Status:** overview only. Detailed step files get written when we start this phase.
