# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| a6878b4e | Stage look-back (kill the review popup) | admin/src/stages/stage-lookback.js, admin/src/ui/stage-recap-sections.js, admin/src/ui/stage-lookback.test.ts, admin/src/styles/design/stage-lookback.css, admin/src/ui/stage-review.js, admin/src/state.ts, admin/src/stage-loaders.js, admin/src/router.js | 2026-07-27 |
| a1867f25 | audit-fixes P3 (the refresh dead end) | frontend/src/main.js, admin/src/main.js, frontend/src/router.js, admin/src/router.js, frontend/src/main.test.js, admin/src/main.test.js, docs/plans/doing/audit-fixes-jul-25/ | 2026-07-28 |
| b16aab10 | Welcome screen: option C, three focus points | admin/src/stages/start-welcome.ts, admin/src/stages/start-welcome.test.ts, admin/src/stages/start-core.js, admin/src/stages/start-core.test.ts, admin/src/styles/design/start-stage.css | 2026-07-29 |
| 63494f50 | Team blank page + drop Members from nav | frontend/src/ui/app-nav.js, frontend/src/ui/app-nav-rows.test.ts, admin/src/boot-shell.js | 2026-07-29 |**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
