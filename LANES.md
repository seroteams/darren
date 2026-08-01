# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| a6878b4e | Stage look-back (kill the review popup) | admin/src/stages/stage-lookback.js, admin/src/ui/stage-recap-sections.js, admin/src/ui/stage-lookback.test.ts, admin/src/styles/design/stage-lookback.css, admin/src/ui/stage-review.js, admin/src/state.ts, admin/src/stage-loaders.js, admin/src/router.js | 2026-07-27 |
| c9200bfa | Nightly database backup (photocopy the notebook) | scripts/backup-db.js, scripts/backup-nightly.ps1, docs/reference/db-backup-restore.md | 2026-07-30 |
| 78d09803 | Action review placement (offer, don't gate) | docs/plans/doing/action-review-placement/, admin/src/stages/questioning.js, admin/src/stages/questioning-ready.ts, admin/src/stages/questioning-ready.test.ts, admin/src/stages/bank.js, admin/src/stages/prior-actions.ts, admin/src/ui/promise-checkin.ts, admin/src/ui/promise-checkin.test.ts, admin/src/styles/design/promise-checkin.css, admin/src/stages/briefing.js, admin/src/ui/promise-agree.ts, admin/src/ui/promise-agree.test.ts | 2026-08-01 |
| 85204553 | Planner prompt trim (say each rule once) | docs/plans/doing/planner-prompt-trim/, content/prompts/plan-turn.md | 2026-08-01 |
| 7cf4af57 | Regression rerun board | docs/plans/doing/regression-rerun-board/, backend/api/services/regression-runs/, backend/api/services/engine-job-slot.ts, backend/api/services/engine-job-slot.test.ts, backend/engine/regression-judge.ts, backend/engine/regression-judge.test.ts, admin/src/stages/regression.js, admin/src/stages/regression-rows.ts, admin/src/stages/regression-rows.test.ts, backend/api/server.ts, admin/src/ui/app-nav.js, shared/api.js, backend/api/services/persona-runs/persona-runs.service.ts, backend/engine/run-history.ts, backend/db/runs-store.ts | 2026-07-31 |



**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
