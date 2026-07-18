# Lane board — who's working on what

Each Claude chat claims a lane here before touching files, and clears it when done.
A hook checks every file edit against this board: editing inside ANOTHER chat's lane
stops the edit and surfaces a warning instead of ploughing in.

**Format (one row per active chat):**

| session | area | paths | claimed |
|---------|------|-------|---------|
| 75619dcd | design-system token sweep | docs/plans/doing/design-system-tokens/, frontend/src/stages/, frontend/src/styles/, frontend/src/ui/, admin/src/styles/design/, scripts/lint-design-tokens.js | 2026-07-18 |
| 82c442a0 | Agency engagement (F16 swap QUEUED behind token sweep) | docs/plans/doing/agency-engagement/ | 2026-07-18 |


**Rules (for Claude sessions — Carl never has to touch this file):**

- `session` = first 8 chars of the session id (from the scratchpad path).
- `paths` = comma-separated files or folders (folders end with `/` or just match by prefix).
- Claim your lane as soon as the work area is clear; keep it narrow.
- Remove your row when the work is committed / wrapped up.
- Claims older than 2 days are treated as stale and ignored by the hook.
- If the hook stops you: tell Carl which chat holds the lane and let HIM decide —
  never edit through another chat's claim silently.
