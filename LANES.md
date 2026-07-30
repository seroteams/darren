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
| 1a2e5006 | Type system P4 (the reading surfaces) | docs/plans/doing/type-system/, admin/src/styles/design/, admin/src/styles/finish-feedback-modal.css, admin/src/ui/finish-feedback-modal.test.ts, admin/src/styles/admin-pulse.css, admin/src/styles/pulse-drilldowns.css, admin/src/styles/add-person-modal.css, admin/src/styles/error-log.css, admin/src/styles/feedback-inbox.css, admin/src/styles/row-menu.css, admin/src/styles/guide.css, admin/src/styles/test-gallery.css, admin/src/styles/lexicon-review.css, admin/src/styles/meeting-arcs.css, admin/src/styles/coach-panel.css, admin/src/styles/design.css, admin/tailwind.config.js, admin/src/stages/questioning.js, admin/src/stages/lexicon-review.js, admin/src/ui/notes-panel.js, admin/src/ui/skeleton-presets.ts, admin/src/ui/skeleton-presets.test.ts, admin/src/ui/account-sheet.ts, admin/src/ui/profile-badge.js, admin/src/ui/build-stamp.js, admin/src/ui/dev-badge.js, frontend/src/styles/team-card.css, frontend/src/stages/preparation.css, frontend/src/stages/preparation-lab.css, frontend/src/stages/member-home.css, frontend/src/stages/guided/guided.css, scripts/lint-design-tokens.js, scripts/test-type-rules.js, scripts/test-design-guard.js, frontend/src/stages/preparation-css.test.ts, .claude/launch.json | 2026-07-31 |



**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
