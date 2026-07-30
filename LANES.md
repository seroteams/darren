# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| a6878b4e | Stage look-back (kill the review popup) | admin/src/stages/stage-lookback.js, admin/src/ui/stage-recap-sections.js, admin/src/ui/stage-lookback.test.ts, admin/src/styles/design/stage-lookback.css, admin/src/ui/stage-review.js, admin/src/state.ts, admin/src/stage-loaders.js, admin/src/router.js | 2026-07-27 |
| c9200bfa | Nightly database backup (photocopy the notebook) | scripts/backup-db.js, scripts/backup-nightly.ps1, docs/reference/db-backup-restore.md | 2026-07-30 |
| f1363886 | Walk-in gate first, bank preloads behind it | admin/src/stages/bank.js | 2026-07-30 |
| c91a58a9 | Coach hints that move with the meeting | docs/plans/doing/coach-hints-live/, backend/api/services/sessions/sessions.service.ts, backend/api/services/sessions/sessions.service.test.ts, backend/engine/questions.test.ts, content/prompts/plan-turn.md | 2026-07-30 |
| 1a2e5006 | Type system P6 (the lock) | docs/plans/doing/type-system/, DESIGN.md, admin/src/styles/design/tokens.css, admin/src/styles/design/type.css, admin/src/styles/design/buttons-inputs.css, admin/src/styles/design/mobile.css, admin/src/styles/design/design-stage.css, admin/src/styles/design/start-stage.css, admin/tailwind.config.js, admin/src/main.js, admin/src/stages/design.js, admin/src/ui/account-sheet.ts, admin/src/ui/profile-badge.js, admin/src/ui/recap-pdf.ts, admin/src/ui/recap-pdf.test.ts, admin/src/ui/skeleton-presets.ts, admin/src/ui/skeleton-presets.test.ts, backend/api/services/notifications/email-layout.ts, backend/api/services/notifications/email-type.ts, backend/api/services/notifications/email-layout.test.ts, frontend/src/stages/guided/guided.css, scripts/lint-design-tokens.js, scripts/test-type-rules.js, scripts/test-design-guard.js | 2026-07-31 |



**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
