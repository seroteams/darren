# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 0e03aa19 | Design consolidation P7 (re-audit + close) | docs/plans/doing/design-consolidation/, STATUS.md, audits/design-audit-2026-07/, docs/screen-gallery/ | 2026-07-24 |
| 17d7a976 | Refactor programme (P4: customer bundle) | docs/plans/doing/refactor-2026-07/, frontend/src/stages/preparation-brief.ts, frontend/src/stages/preparation-brief.test.ts, frontend/src/stages/preparation-css.test.ts, frontend/src/stages/preparation.ts, frontend/src/stages/preparation.css, frontend/src/stages/preparation-lab.ts, frontend/src/stages/preparation-lab.css, frontend/src/boot-splash.js, admin/src/boot-splash.js, admin/src/styles/design/motion.css, admin/src/styles/design/stage-exit.css, admin/src/main.js, admin/src/router.js, admin/src/stages/admin-error-log.ts, admin/src/stages/admin-runs.ts, admin/src/stages/gallery/screens.js, admin/src/ui/coach-panel-state.ts, admin/src/ui/group-people.js, admin/src/ui/review-serialize.js, frontend/src/stages/guided/guided-arcs.ts, frontend/src/stages/member-home-view.ts | 2026-07-25 |

**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
