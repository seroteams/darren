# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| a6878b4e | Stage look-back (kill the review popup) | admin/src/stages/stage-lookback.js, admin/src/ui/stage-recap-sections.js, admin/src/ui/stage-lookback.test.ts, admin/src/styles/design/stage-lookback.css, admin/src/ui/stage-review.js, admin/src/state.ts, admin/src/stage-loaders.js, admin/src/router.js | 2026-07-27 |




| e0011772 | Live-only blue favicon | frontend/public/favicon.svg, frontend/public/favicon-local.svg, admin/public/favicon.svg, admin/public/favicon-local.svg, shared/favicon-env.js, shared/favicon-env.test.ts, frontend/src/main.js, admin/src/main.js | 2026-07-29 |

| f8128927 | Error-log uuid guards (dev side-door 500s) | backend/api/services/feedback/feedback.repo.ts, backend/api/services/feedback/feedback.repo.test.ts, backend/api/services/auth/auth.repo.ts, backend/api/services/auth/auth.repo.test.ts, backend/db/sessions-store.ts, backend/db/sessions-store.test.ts | 2026-07-29 |

**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
