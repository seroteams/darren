# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| a6878b4e | Stage look-back (kill the review popup) | admin/src/stages/stage-lookback.js, admin/src/ui/stage-recap-sections.js, admin/src/ui/stage-lookback.test.ts, admin/src/styles/design/stage-lookback.css, admin/src/ui/stage-review.js, admin/src/state.ts, admin/src/stage-loaders.js, admin/src/router.js | 2026-07-27 |
| c9200bfa | Nightly database backup (photocopy the notebook) | scripts/backup-db.js, scripts/backup-nightly.ps1, docs/reference/db-backup-restore.md | 2026-07-30 |
| 42ef945d | No dead wires P3 (living plan: queue rewrites from the conversation) | docs/plans/doing/no-dead-wires/, backend/engine/messages.ts, backend/engine/messages.test.ts, content/prompts/plan-turn.md, backend/engine/question-generator.ts, backend/engine/question-generator.test.ts, backend/engine/queue-manager.ts, backend/engine/queue-manager.test.ts | 2026-07-30 |
| 1a2e5006 | Type system P0-P1 (font name fix + token layers) | docs/plans/doing/type-system/, admin/src/styles/design/tokens.css, admin/src/styles/design/base.css, admin/src/styles/design/type.css, admin/tailwind.config.js, admin/src/styles/design/admin-tables.css, admin/src/styles/design/briefing.css, admin/src/styles/design.css, scripts/lint-design-tokens.js, scripts/test-type-rules.js, scripts/test-design-guard.js | 2026-07-30 |



**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
