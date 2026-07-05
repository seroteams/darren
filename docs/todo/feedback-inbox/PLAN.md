# Feedback inbox — see what testers send

**Goal:** Carl can read every note sent through the in-app "Send feedback" form, across all
companies, on one admin screen — backed by its own database table instead of a server-side file.

**Requested:** 2026-07-05 (Carl: "i need a new page on the admin section that sees this data
when its shared. thinking this may need its own table on the database too").

**Shape:** one phase — it's the error-log pattern (table → superadmin route → screen) applied
to feedback, small enough to land in one slice.

---

## Current state

- **Phase 1 — BUILT, awaiting Carl's walk (2026-07-05).** Whole slice done + live-verified
  end-to-end on a scratch API (send → Neon row → inbox screen shows it → test data cleaned up).
  Free checks: `npm test` 72/72 · both typechecks clean (4 pre-existing backend errors in
  `answer-suggester.test.ts` belong to another track).
- ⚠️ Two touched files are **left uncommitted** because they carry other sessions' in-flight
  work: `shared/api.js` (holds `getFeedbackInbox` + error-log/run-preview changes) and
  `admin/src/ui/app-nav.js` (holds the Feedback-inbox nav row + the Lucide icon rework).
  Whichever track commits first carries them; the feature needs both files to run from a
  fresh checkout.

## What was built (Phase 1)

- **`feedback_notes` table on Neon** (migration `0006`): id · org_id · user_id (nullable FKs,
  indexed) · message · page · created_at. Applied + verified live.
- **Store moved**: `POST /api/v1/feedback` now writes the table via `pgFeedbackRepo`
  (`feedback.repo.ts`); the old JSONL file (`content/data/feedback/feedback.jsonl`,
  git-ignored) stays on disk as an archive — its only line is a throwaway QA test note,
  so nothing was migrated.
- **`GET /api/v1/admin/feedback`** — superadmin-gated (same `superadminV1` wall as the Error
  log), newest first, LEFT JOINs users + organizations for name/company.
- **Feedback inbox screen** (`admin/src/stages/admin-feedback.ts`) + superadmin-only nav row
  under Admin (below Error log). Read-only table: When · Who · Screen · The note.
- Service stays storage-agnostic + unit-tested against a fake repo (7 tests, red→green).

## Parked (not in this phase)

- Filters (by company), mark-as-read / resolve, delete a note, pagination past 200.
- Importing old JSONL notes (nothing real to import today).
- Email/Slack ping when a note arrives.

## QA — Carl's walk

See [phase-1.md](phase-1.md). Scratch pair may still be running: app on **:3033** → API on
**:3031** (both die with the session; your own dev works too once your API restarts).
