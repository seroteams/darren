# Phase 003 · Step 01 — The rating endpoint (backend, test-first) ✅

## Goal
Let a manager save a 1–5 star rating (+ optional note) on one of their OWN runs, stored safely.

## What shipped
- `POST /api/v1/runs/mine/:id/rating` — member-safe (login required, any role), **origin-guarded**,
  fenced by org **and** user (a run you don't own → 404, so ids can't be probed or rated).
- Stored as a **`rating.json` sidecar** in the run folder, written **atomically** (temp + rename), shape
  `{ version, runId, stars, note, ratedBy, createdAt, updatedAt }`.
- Validation: `stars` must be a **number, integer, 1–5** (else 400); note trimmed + capped at 4000; the
  note is a **private manager field** — never logged, and `**/rating.json` is git-ignored.
- Rating surfaced in `memberRunView` (detail) and `listFinishedRunsForMember` (list) as
  `rating: { stars, note, updatedAt } | null`, so the UI can show it.

## Files
`backend/api/services/runs/runs.repo.ts` (read/writeRating, atomic) · `runs.service.ts` (`rateMine` +
validation/fence) · `runs.controller.ts` (`rateMine` handler) · `backend/api/server.ts` (route) ·
`backend/engine/run-history.ts` (`ratingOf` + surfacing) · `.gitignore` (`**/rating.json`) ·
`runs.service.test.ts` (5 new tests).

## Verified (free) ✅
`npm test` **53/53** (incl. valid write, note trim+cap, bad stars → 400, not-owner/unknown → 404, write
failure → 500) · `npm run typecheck` clean.
