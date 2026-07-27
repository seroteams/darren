# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| a6878b4e | Stage look-back (kill the review popup) | admin/src/stages/stage-lookback.js, admin/src/ui/stage-recap-sections.js, admin/src/ui/stage-lookback.test.ts, admin/src/styles/design/stage-lookback.css, admin/src/ui/stage-review.js, admin/src/state.ts, admin/src/stage-loaders.js, admin/src/router.js | 2026-07-27 |
| 43ed6aba | About page visual rebuild | admin/src/stages/about.js, admin/src/stages/about.test.ts, admin/src/styles/design/about-stage.css, admin/src/styles/design.css | 2026-07-27 |
| a1867f25 | entry-redesign P2 (Version A into the real auth screens) | admin/src/stages/login.js, admin/src/stages/register.js, admin/src/stages/auth-screens.test.ts, admin/src/styles/design/auth.css, frontend/src/stages/welcome.ts, frontend/src/stages/welcome.test.ts, backend/api/services/auth/auth.service.ts, docs/plans/doing/entry-redesign/ | 2026-07-27 |

**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
