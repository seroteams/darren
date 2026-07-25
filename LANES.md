# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 0e03aa19 | Design consolidation P7 (re-audit + close) | docs/plans/doing/design-consolidation/, STATUS.md, audits/design-audit-2026-07/, docs/screen-gallery/ | 2026-07-24 |
| 0d52559f | Google sign-in (plan setup) | docs/plans/doing/google-signin/, backend/api/services/auth/google-auth.service.ts, backend/api/services/auth/google-auth.controller.ts, backend/api/services/auth/google-auth.repo.ts, backend/api/services/auth/google-auth.service.test.ts, backend/api/services/auth/google-auth.controller.test.ts, backend/db/schema.ts, backend/api/middleware/cookies.ts, admin/src/stages/login.js, admin/src/stages/register.js, admin/src/stages/auth-screens.test.ts, admin/public/google-g.svg, frontend/public/google-g.svg, .env.example, render.yaml | 2026-07-25 |
| 35146fdf | Carl Method portable pack | docs/carl-method/ | 2026-07-25 |
| 5dce1d63 | Home screen truth (P1: honest recent rows) | docs/plans/doing/home-screen-truth/, admin/src/stages/start-core.js, admin/src/stages/start-core.test.ts, admin/src/stages/start-rows.ts, admin/src/stages/start-rows.test.ts, admin/src/stages/intake-firstrun.ts, admin/src/stages/intake-firstrun.test.ts, admin/src/stages/runs.ts, admin/src/ui/time.ts, admin/src/ui/time.test.ts, admin/src/styles/design/start-stage.css, backend/api/services/runs/runs.service.ts, backend/api/services/runs/runs.service.test.ts | 2026-07-25 |

**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
