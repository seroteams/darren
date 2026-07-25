# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 0e03aa19 | Design consolidation P7 (re-audit + close) | docs/plans/doing/design-consolidation/, STATUS.md, audits/design-audit-2026-07/, docs/screen-gallery/ | 2026-07-24 |
| 0d52559f | Google sign-in (plan setup) | docs/plans/doing/google-signin/, backend/api/services/auth/google-auth.service.ts, backend/api/services/auth/google-auth.controller.ts, backend/api/services/auth/google-auth.repo.ts, backend/api/services/auth/google-auth.service.test.ts, backend/api/services/auth/google-auth.controller.test.ts, backend/db/schema.ts, backend/api/middleware/cookies.ts, admin/src/stages/login.js, admin/src/stages/register.js, admin/src/stages/auth-screens.test.ts, admin/public/google-g.svg, frontend/public/google-g.svg, .env.example, render.yaml | 2026-07-25 |
| 17d7a976 | Refactor programme (P6: run projections) | docs/plans/doing/refactor-2026-07/, backend/engine/run-history.ts, backend/db/runs-store.ts, backend/engine/run-projections.ts | 2026-07-25 |

**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
