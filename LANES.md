# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 0e03aa19 | Design consolidation P7 (re-audit + close) | docs/plans/doing/design-consolidation/, STATUS.md, audits/design-audit-2026-07/, docs/screen-gallery/ | 2026-07-24 |
| 35146fdf | Carl Method portable pack | docs/carl-method/ | 2026-07-25 |
| 794bbf0e | Onboarding first-run P2 (brief-first welcome + video) | docs/plans/doing/onboarding-firstrun/, admin/src/stages/start-core.js, admin/src/stages/start-core.test.ts, admin/src/stages/start-welcome.ts, admin/src/stages/start-welcome.test.ts, admin/src/stages/intake-firstrun.ts, admin/src/stages/intake-firstrun.test.ts, admin/src/styles/design/start-stage.css, backend/api/middleware/security-headers.ts, backend/tests/runs/test-security-headers.js | 2026-07-25 |
| 4b899314 | Audit fix-up P2 (shell + layout) | docs/plans/doing/audit-fixes-jul-25/, audits/full-app-audit-2026-07-25/p2-proof/, admin/src/styles/design/primitives.css, admin/src/styles/design/session-topbar.css, admin/src/styles/design/app-nav.css, admin/src/ui/session-topbar.js, frontend/src/ui/app-nav.js, frontend/src/router.js, frontend/src/ui/app-nav-flow.test.ts | 2026-07-25 |

**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
