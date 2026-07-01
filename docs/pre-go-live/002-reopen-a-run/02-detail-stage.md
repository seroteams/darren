# Phase 002 · Step 02 — A read-only run-detail stage at /runs/:id

## Goal
A new member stage that opens one past 1:1 and shows its briefing read-only, with a "Back to Runs" link.

## What you'll have
- A `RUN_DETAIL` member stage routed at `/runs/:id` (param `myRunId`), that fetches `getMyRun()` and
  renders the briefing the manager saw — What stood out / What we understood / Honest read / **What to do
  next** / **Reminders** — plus loading / error / not-found states. No admin QA tools; no rating (PG3).

## Technical detail
- **state.js:** add `RUN_DETAIL` to `STAGES` and `myRunId: null` to `initial`.
- **router.js:** `PATH_FOR[RUN_DETAIL] = (s) => s.myRunId ? \`/runs/${encodeURIComponent(s.myRunId)}\` :
  "/runs"`; in `parseLocation`, match `^/runs/([^/]+)$` → `{ stage: RUN_DETAIL, params: { myRunId } }`
  (after the exact-path check, so `/runs` still → RUNS); add `RUN_DETAIL` to `MEMBER_ONLY`.
- **main.js:** add the loader; in the **member** boot and in `startPopstate`, handle `RUN_DETAIL` with
  `params.myRunId` (set `myRunId` + stage; missing id → bounce to `/runs`) — **before** the generic
  `isMemberStage` branch so the id isn't dropped.
- **new `admin/src/stages/run-detail.ts`:** read `store.myRunId`; render loading → `getMyRun` → briefing;
  reuse the field set from [review-run.js](../../../admin/src/stages/review-run.js) `renderBriefing`
  (member-safe, briefing-only — `memberRunView` has no prep/transcript). `escapeHtml` every value.

## Check
- `npm run typecheck` clean; `npm test` green. Deep-link `/runs/<id>` opens read-only; a bad id → a plain
  "couldn't open" card; another member's id → 404 → the same card.
