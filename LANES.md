# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 35146fdf | Carl Method portable pack | docs/carl-method/ | 2026-07-25 |
| 4b899314 | Audit fix-up P2 (shell + layout) | docs/plans/doing/audit-fixes-jul-25/, audits/full-app-audit-2026-07-25/p2-proof/, admin/src/styles/design/primitives.css, admin/src/styles/design/session-topbar.css, admin/src/styles/design/app-nav.css, admin/src/ui/session-topbar.js, frontend/src/router.js, frontend/src/ui/app-nav-flow.test.ts | 2026-07-25 |
| f1f7e175 | Checkpoint sweep (trackers, tidy, guides) | STATUS.md, SERO_BOARD.md, LANES.md, docs/reference/structure.md, docs/reference/trackers.md, docs/reports/sero-changelog.html, docs/README.md | 2026-07-26 |
| a965735e | Org sector field (capture only — no engine wiring) | backend/db/schema.ts, backend/db/migrations/, backend/api/services/auth/auth.service.ts, backend/api/services/auth/auth.service.test.ts, backend/api/services/auth/auth.repo.ts, backend/api/services/auth/auth.controller.ts, backend/api/server.ts, shared/api.js, shared/sectors.ts, admin/src/ui/account-sheet.ts, admin/src/stages/register.js, backend/tests/auth/, logs/committee/ | 2026-07-26 |

**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
